import Report from '../models/Report.js';
import User from '../models/User.js';
import { applyPriorityForReport } from '../utils/priorityEngine.js';
import { publishRealtimeEvent } from '../utils/realtimeBus.js';
import { sendReportStatusUpdateEmail } from '../utils/emailService.js';
import { uploadImage } from '../utils/mediaService.js';

const notifyReportStatusUpdate = async ({ report, status, notes }) => {
  if (!report?.user?.email) return;

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔔 [DEV NOTIFICATION] Report status update');
    console.log('   Report ID:', report._id?.toString?.() || report._id);
    console.log('   User:', report.user.email);
    console.log('   Status:', status);
    if (notes) {
      console.log('   Notes:', notes);
    }
    return;
  }

  await sendReportStatusUpdateEmail(report.user.email, report.user.name, report, status, notes);
};

/**
 * @desc    Get all reports with filters (Admin only)
 * @route   GET /api/admin/reports
 * @access  Private/Admin
 */
export const getAllReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      severity,
      department,
      assignedTo,
      userId,
      sortBy = 'createdAt',
      order = 'desc',
      search,
      startDate,
      endDate,
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (severity) {
      query.severity = severity;
    }

    if (department) {
      query.department = department;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (userId) {
      query.user = userId;
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const reports = await Report.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email role')
      .populate('assignedTo', 'name email role')
      .select('-history') // Exclude history for list view
      .lean();

    // Get total count
    const total = await Report.countDocuments(query);

    // Get statistics
    const stats = await Report.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          reported: {
            $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] },
          },
          acknowledged: {
            $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          avgUpvotes: { $avg: '$upvotes' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        stats: stats[0] || {},
      },
    });
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update report status (Admin only) - FIXED: No duplicate history entries
 * @route   PATCH /api/admin/reports/:reportId/status
 * @access  Private/Admin
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user._id;

    // Validate status
    const validStatuses = [
      'reported',
      'acknowledged',
      'in_progress',
      'resolved',
      'closed',
      'rejected',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find report
    const report = await Report.findById(reportId).populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if status is actually changing
    if (report.status === status) {
      return res.status(400).json({
        success: false,
        message: `Report is already in ${status} status`,
      });
    }

    // Update status
    const previousStatus = report.status;
    report.status = status;
    report.setUpdatingUser(adminId);

    if (status === 'acknowledged' && !report.firstAcknowledgedAt) {
      report.firstAcknowledgedAt = new Date();
    }

    if (['resolved', 'closed'].includes(status) && !report.resolvedAt) {
      report.resolvedAt = new Date();
    }

    if (['reported', 'acknowledged', 'in_progress'].includes(status)) {
      report.resolvedAt = null;
    }

    try {
      await applyPriorityForReport(report);
    } catch (priorityError) {
      console.error('Priority update skipped during status update:', priorityError.message);
    }

    // If resolving, require at least one resolution image
    if (status === 'resolved') {
      const resolutionFiles = req.files?.resolutionImages;
      if (!resolutionFiles || resolutionFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one resolution image is required when resolving a complaint',
        });
      }

      // Upload resolution images to Cloudinary
      const resolutionMedia = [];
      for (const file of resolutionFiles) {
        const result = await uploadImage(file.buffer, file.originalname, reportId);
        resolutionMedia.push({
          type: 'image',
          url: result.url,
          thumbnail: result.thumbnailUrl,
        });
      }
      report.resolutionMedia = resolutionMedia;
    }

    // DON'T manually add to history - let the pre-save hook handle it
    // The pre-save hook will automatically create the history entry

    await report.save();

    // Populate the history for response
    await report.populate('history.updatedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      data: {
        report: {
          _id: report._id,
          title: report.title,
          status: report.status,
          category: report.category,
          severity: report.severity,
          priorityScore: report.priorityScore,
          priorityLevel: report.priorityLevel,
          user: report.user,
          updatedAt: report.updatedAt,
          history: report.history.slice(-5), // Last 5 history entries
        },
      },
    });

    publishRealtimeEvent('report:status_changed', {
      reportId: report._id,
      previousStatus,
      status: report.status,
      severity: report.severity,
      priorityScore: report.priorityScore,
      priorityLevel: report.priorityLevel,
      userId: report.user?._id || null,
      userEmail: report.user?.email || null,
      updatedBy: adminId,
    });

    notifyReportStatusUpdate({ report, status, notes })
      .catch((err) => console.error('Failed to dispatch status update notification:', err));
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating report status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Reject report with reason (Admin only) - FIXED: No duplicate history entries
 * @route   PATCH /api/admin/reports/:reportId/reject
 * @access  Private/Admin
 */
export const rejectReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    // Validate reason
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    if (reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be at least 10 characters',
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason cannot exceed 500 characters',
      });
    }

    // Find report
    const report = await Report.findById(reportId).populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if already rejected
    if (report.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Report is already rejected',
      });
    }

    // IMPORTANT: Set BOTH status and rejectionReason BEFORE saving
    // This way, pre-save hook sees both changes at once and creates proper history
    const previousStatus = report.status;
    report.status = 'rejected';
    report.rejectionReason = reason.trim();
    report.setUpdatingUser(adminId);
    try {
      await applyPriorityForReport(report);
    } catch (priorityError) {
      console.error('Priority update skipped during reject flow:', priorityError.message);
    }

    // Save once - pre-save hook will handle history
    await report.save();

    // Populate the history for response
    await report.populate('history.updatedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Report rejected successfully',
      data: {
        report: {
          _id: report._id,
          title: report.title,
          status: report.status,
          rejectionReason: report.rejectionReason,
          category: report.category,
          severity: report.severity,
          priorityScore: report.priorityScore,
          priorityLevel: report.priorityLevel,
          user: report.user,
          updatedAt: report.updatedAt,
          history: report.history.slice(-5),
        },
      },
    });

    publishRealtimeEvent('report:status_changed', {
      reportId: report._id,
      previousStatus,
      status: report.status,
      severity: report.severity,
      priorityScore: report.priorityScore,
      priorityLevel: report.priorityLevel,
      userId: report.user?._id || null,
      userEmail: report.user?.email || null,
      updatedBy: adminId,
      notes: reason.trim(),
    });

    notifyReportStatusUpdate({ report, status: 'rejected', notes: reason.trim() })
      .catch((err) => console.error('Failed to dispatch rejection notification:', err));
  } catch (error) {
    console.error('Reject report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get all users with filters (Admin only)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      isVerified,
      sortBy = 'createdAt',
      order = 'desc',
      search,
    } = req.query;

    // Build query
    const query = {};

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    // Search in name and email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const users = await User.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -verificationOTP -verificationOTPExpires -passwordResetOTP -passwordResetOTPExpires')
      .lean();

    // Get total count
    const total = await User.countDocuments(query);

    // Get user statistics
    const stats = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
          verifiedUsers: {
            $sum: { $cond: ['$isVerified', 1, 0] },
          },
          admins: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
          },
          regularUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] },
          },
        },
      },
    ]);

    // Get report counts for each user
    const usersWithReports = await Promise.all(
      users.map(async (user) => {
        const reportCount = await Report.countDocuments({ user: user._id });
        return { ...user, reportCount };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        users: usersWithReports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        stats: stats[0] || {},
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get user details with stats (Admin only)
 * @route   GET /api/admin/users/:userId
 * @access  Private/Admin
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get report statistics for this user
    const reportStats = await Report.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          reported: {
            $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          totalUpvotes: { $sum: '$upvotes' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: reportStats[0] || {
          totalReports: 0,
          reported: 0,
          resolved: 0,
          rejected: 0,
          totalUpvotes: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user status (Admin only)
 * @route   PATCH /api/admin/users/:userId/status
 * @access  Private/Admin
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Validate isActive
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    // Find user
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status',
      });
    }

    // Update status
    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user role (Admin only)
 * @route   PATCH /api/admin/users/:userId/role
 * @access  Private/Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "user" or "admin"',
      });
    }

    // Find user
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }

    // Update role
    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/admin/users/:userId
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Optional: Delete or reassign user's reports
    // Option 1: Delete all user's reports
    // await Report.deleteMany({ user: userId });

    // Option 2: Set user field to null (anonymous reports)
    await Report.updateMany({ user: userId }, { $set: { user: null } });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUserId: userId,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get report statistics
    const reportStats = await Report.aggregate([
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          reported: {
            $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] },
          },
          acknowledged: {
            $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          totalUpvotes: { $sum: '$upvotes' },
          avgUpvotes: { $avg: '$upvotes' },
        },
      },
    ]);

    // Get reports by category
    const categoryStats = await Report.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get reports by severity
    const severityStats = await Report.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
          verifiedUsers: {
            $sum: { $cond: ['$isVerified', 1, 0] },
          },
          admins: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
          },
        },
      },
    ]);

    // Get recent reports (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReportsCount = await Report.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get today's reports
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayReportsCount = await Report.countDocuments({
      createdAt: { $gte: todayStart },
    });

    res.status(200).json({
      success: true,
      data: {
        reports: reportStats[0] || {},
        categories: categoryStats,
        severity: severityStats,
        users: userStats[0] || {},
        recentActivity: {
          last7Days: recentReportsCount,
          today: todayReportsCount,
        },
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get report details with full history (Admin only)
 * @route   GET /api/admin/reports/:reportId
 * @access  Private/Admin
 */
export const getReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate('user', 'name email role isActive')
      .populate('assignedTo', 'name email role isActive')
      .populate('history.updatedBy', 'name email role')
      .populate('upvotedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        report: {
          ...report.toObject(),
          department: report.department,
          routingReason: report.routingReason,
          routingMetadata: report.routingMetadata,
          assignedTo: report.assignedTo,
          assignmentNotes: report.assignmentNotes,
        },
      },
    });
  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching report details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Manually override report routing (department + assignee)
 * @route   PATCH /api/admin/reports/:reportId/routing
 * @access  Private/Admin
 */
export const overrideReportRouting = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { department, assignedTo = null, routingReason = '', assignmentNotes = '' } = req.body;
    const adminId = req.user._id;

    const report = await Report.findById(reportId).populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    let assigneeUser = null;
    if (assignedTo) {
      assigneeUser = await User.findById(assignedTo).select('_id name email role isActive');

      if (!assigneeUser) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found',
        });
      }

      if (!assigneeUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user account is inactive',
        });
      }
    }

    report.department = department;
    report.assignedTo = assigneeUser ? assigneeUser._id : null;
    report.routingReason = routingReason || `Manually overridden by admin ${req.user.email || adminId}`;
    report.assignmentNotes = assignmentNotes || '';
    report.routingMetadata = {
      ...report.routingMetadata,
      autoRouted: false,
      routedAt: new Date(),
    };

    report.history.push({
      status: report.status,
      notes: `Routing updated: ${department}${assigneeUser ? `; assigned to ${assigneeUser.name}` : '; unassigned'}`,
      updatedBy: adminId,
      timestamp: new Date(),
    });

    await report.save();
    await report.populate('assignedTo', 'name email role');
    await report.populate('history.updatedBy', 'name email role');

    publishRealtimeEvent('report:routing_updated', {
      reportId: report._id,
      department: report.department,
      assignedTo: report.assignedTo?._id || null,
      updatedBy: adminId,
    });

    res.status(200).json({
      success: true,
      message: 'Report routing updated successfully',
      data: {
        report: {
          _id: report._id,
          title: report.title,
          status: report.status,
          department: report.department,
          assignedTo: report.assignedTo,
          routingReason: report.routingReason,
          assignmentNotes: report.assignmentNotes,
          routingMetadata: report.routingMetadata,
          updatedAt: report.updatedAt,
          history: report.history.slice(-5),
        },
      },
    });
  } catch (error) {
    console.error('Override report routing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while overriding report routing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};