

const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");

const ownTrip = async (tripId, userId, res) => {
  const trip = await db.findById("trips", tripId);
  if (!trip) {
    res.status(404).json({ message: "Trip not found." });
    return null;
  }
  if (trip.user_id !== userId) {
    res.status(403).json({ message: "Access denied." });
    return null;
  }
  return trip;
};

const buildBudgetSummary = async (trip) => {
  const expenses = await db.findAll("expenses", { trip_id: trip.id });
  const total_spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining   = trip.budget != null ? Number(trip.budget) - total_spent : null;
  const over_budget = remaining != null && remaining < 0;

  return {
    budget:        trip.budget != null ? Number(trip.budget) : null,
    total_spent:   parseFloat(total_spent.toFixed(2)),
    remaining:     remaining   != null ? parseFloat(remaining.toFixed(2)) : null,
    over_budget,
    expenses,
  };
};


const getBudget = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip   = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  res.json(await buildBudgetSummary(trip));
});


const setBudget = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip   = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const { budget } = req.body;

  if (budget == null || isNaN(Number(budget)) || Number(budget) < 0) {
    return res.status(400).json({ message: "Budget must be a non-negative number." });
  }

  const updated = await db.update("trips", trip.id, { budget: Number(budget) });
  res.json({ message: "Budget updated.", ...(await buildBudgetSummary(updated)) });
});


const getExpenses = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip   = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const expenses = await db.findAll("expenses", { trip_id: tripId });
  res.json({ expenses });
});


const addExpense = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip   = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const { amount, category, description } = req.body;

  const expense = await db.insert("expenses", {
    trip_id:     tripId,
    amount:      Number(amount),
    category,
    description: description || null,
  });

  const summary = await buildBudgetSummary(await db.findById("trips", tripId));

  res.status(201).json({
    message:     "Expense added.",
    expense,
    budget_summary: summary,
    warning: summary.over_budget ? "Budget exceeded." : undefined,
  });
});


const deleteExpense = asyncHandler(async (req, res) => {
  const tripId    = parseInt(req.params.tripId, 10);
  const expenseId = parseInt(req.params.id, 10);

  const trip = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const expense = await db.findById("expenses", expenseId);
  if (!expense || expense.trip_id !== tripId) {
    return res.status(404).json({ message: "Expense not found." });
  }

  await db.delete("expenses", expenseId);

  const summary = await buildBudgetSummary(await db.findById("trips", tripId));

  res.json({
    message:        "Expense deleted.",
    budget_summary: summary,
  });
});

module.exports = { getBudget, setBudget, getExpenses, addExpense, deleteExpense };
