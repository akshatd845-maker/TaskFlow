import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import User from '../models/User.js';
import { getListIdsForBoards, getUserBoardIds } from '../utils/boardAccess.js';
import logger from '../config/logger.js';

const toObjectId = (id) => {


  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const COMPLETED_STATUSES = ['done'];
const PENDING_STATUSES = ['todo', 'in-progress', 'review'];

const getUserProjectIds = async (userId) => {
  const projects = await Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
    isArchived: { $ne: true }
  }).select('_id');
  return projects.map((p) => p._id);
};

const getUserListIds = async (userId) => {
  const boards = await getUserBoardIds(userId);
  const boardIds = boards.map((b) => b._id);
  return getListIdsForBoards(boardIds);
};


export const getOverview = async (req, res) => {
  const userId = req.user?._id;

  try {
    const projectIds = await getUserProjectIds(userId);
    const listIds = await getUserListIds(userId);

    const cardMatch = listIds.length ? { list: { $in: listIds } } : { _id: null };

    const [agg] = await Card.aggregate([
      { $match: cardMatch },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $in: ['$status', COMPLETED_STATUSES] }, 1, 0] }
          },
          pendingTasks: {
            $sum: {
              $cond: [{ $in: ['$status', PENDING_STATUSES] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          completionRate: {
            $cond: [
              { $gt: ['$totalTasks', 0] },
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    const totals = agg || { totalTasks: 0, completedTasks: 0, pendingTasks: 0, completionRate: 0 };

    res.json({
      totalProjects: projectIds.length,
      totalTasks: totals.totalTasks,
      completedTasks: totals.completedTasks,
      pendingTasks: totals.pendingTasks,
      completionRate: Number((totals.completionRate || 0).toFixed(2))
    });
  } catch (e) {
    logger.error('Failed to load analytics overview', { error: e?.message, stack: e?.stack });
    res.status(500).json({ message: 'Failed to load analytics overview' });
  }
};

export const getProjectProgress = async (req, res) => {
  const userId = req.user?._id;

  try {
    const projectIds = await getUserProjectIds(userId);

    const projects = await Project.find({ _id: { $in: projectIds } })
      .select('_id title status isArchived')
      .lean();

    const boards = await Board.find({ project: { $in: projectIds } }).select('_id project').lean();
    const boardByProject = new Map(boards.map((b) => [String(b.project), b._id]));

    const listIds = await getListIdsForBoards(boards.map((b) => b._id));

    const boardIds = boards.map((b) => b._id);
    const lists = listIds.length
      ? await import('../models/List.js').then((m) =>
          m.default.find({ board: { $in: boardIds } }).select('_id board').lean()
        )
      : [];

    const listToProject = new Map();
    for (const list of lists) {
      const board = boards.find((b) => String(b._id) === String(list.board));
      if (board?.project) {
        listToProject.set(String(list._id), String(board.project));
      }
    }

    const cardAgg = listIds.length
      ? await Card.aggregate([
          { $match: { list: { $in: listIds } } },
          {
            $group: {
              _id: '$list',
              totalTasks: { $sum: 1 },
              completedTasks: {
                $sum: { $cond: [{ $in: ['$status', COMPLETED_STATUSES] }, 1, 0] }
              }
            }
          }
        ])
      : [];

    const progressByProject = new Map();
    for (const row of cardAgg) {
      const projectId = listToProject.get(String(row._id));
      if (!projectId) continue;
      const current = progressByProject.get(projectId) || { totalTasks: 0, completedTasks: 0 };
      current.totalTasks += row.totalTasks;
      current.completedTasks += row.completedTasks;
      progressByProject.set(projectId, current);
    }

    const response = projects.map((p) => {
      const r = progressByProject.get(String(p._id)) || { totalTasks: 0, completedTasks: 0 };
      const progress = r.totalTasks > 0 ? (r.completedTasks / r.totalTasks) * 100 : 0;
      return {
        projectId: String(p._id),
        projectName: p.title,
        boardId: boardByProject.get(String(p._id)) ? String(boardByProject.get(String(p._id))) : null,
        totalTasks: r.totalTasks,
        completedTasks: r.completedTasks,
        progress: Number(progress.toFixed(2))
      };
    });

    response.sort((a, b) => b.progress - a.progress);
    res.json(response);
  } catch (e) {
    logger.error('Failed to load project progress analytics', { error: e?.message, stack: e?.stack });
    res.status(500).json({ message: 'Failed to load project progress analytics' });
  }
};

export const getTeamProductivity = async (req, res) => {
  const userId = req.user?._id;

  try {
    const projectIds = await getUserProjectIds(userId);
    const listIds = await getUserListIds(userId);

    const projectDocs = await Project.find({ _id: { $in: projectIds } })
      .select('owner members.user')
      .lean();

    const userIdSet = new Set();
    for (const p of projectDocs) {
      if (p.owner) userIdSet.add(String(p.owner));
      for (const m of p.members || []) {
        if (m.user) userIdSet.add(String(m.user));
      }
    }

    const teamUserIds = Array.from(userIdSet);
    const cardMatch = listIds.length
      ? { list: { $in: listIds }, status: { $in: COMPLETED_STATUSES } }
      : { _id: null };

    const results = await Card.aggregate([
      { $match: cardMatch },
      { $unwind: '$assignedTo' },
      {
        $match: {
          assignedTo: { $in: teamUserIds.map((id) => toObjectId(id)).filter(Boolean) }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          completedTasks: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          completedTasks: 1
        }
      }
    ]);

    const byUser = new Map(results.map((r) => [String(r.userId), r.completedTasks]));

    const users = await User.find({
      _id: { $in: teamUserIds.map((id) => toObjectId(id)).filter(Boolean) }
    })
      .select('_id name')
      .lean();

    const response = users.map((u) => ({
      userId: String(u._id),
      name: u.name,
      completedTasks: byUser.get(String(u._id)) || 0
    }));

    response.sort((a, b) => b.completedTasks - a.completedTasks);
    res.json(response);
  } catch (e) {
    logger.error('Failed to load team productivity analytics', { error: e?.message, stack: e?.stack });
    res.status(500).json({ message: 'Failed to load team productivity analytics' });
  }
};

export const getTaskStatus = async (req, res) => {
  const userId = req.user?._id;

  try {
    const listIds = await getUserListIds(userId);
    const cardMatch = listIds.length ? { list: { $in: listIds } } : { _id: null };

    const [agg] = await Card.aggregate([
      { $match: cardMatch },
      {
        $group: {
          _id: null,
          completed: {
            $sum: { $cond: [{ $in: ['$status', COMPLETED_STATUSES] }, 1, 0] }
          },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', PENDING_STATUSES] }, 1, 0]
            }
          }
        }
      },
      { $project: { _id: 0, completed: 1, pending: 1 } }
    ]);

    res.json(agg || { completed: 0, pending: 0 });
  } catch (e) {
    logger.error('Failed to load task status analytics', { error: e?.message, stack: e?.stack });
    res.status(500).json({ message: 'Failed to load task status analytics' });
  }
};
