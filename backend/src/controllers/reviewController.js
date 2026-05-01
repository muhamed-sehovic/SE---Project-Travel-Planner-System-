

const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");


const getReviews = asyncHandler(async (req, res) => {
  const destinationId = parseInt(req.params.destinationId, 10);

  const destination = await db.findById("destinations", destinationId);
  if (!destination) {
    return res.status(404).json({ message: "Destination not found." });
  }

  const reviews = await db.findAll("reviews", { destination_id: destinationId });

  reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const enriched = await Promise.all(
    reviews.map(async (r) => {
      const user = await db.findById("users", r.user_id);
      return {
        ...r,
        username: user ? user.username : "Unknown",
      };
    })
  );

  const average_rating =
    reviews.length > 0
      ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
      : null;

  res.json({
    destination,
    reviews:        enriched,
    average_rating,
    total_reviews:  reviews.length,
  });
});


const createReview = asyncHandler(async (req, res) => {
  const destinationId = parseInt(req.params.destinationId, 10);
  const { rating, comment } = req.body;

  const destination = await db.findById("destinations", destinationId);
  if (!destination) {
    return res.status(404).json({ message: "Destination not found." });
  }

  const review = await db.insert("reviews", {
    user_id:        req.user.id,
    destination_id: destinationId,
    rating:         parseInt(rating, 10),
    comment:        comment || null,
  });

  res.status(201).json({ message: "Review submitted.", review });
});


const updateReview = asyncHandler(async (req, res) => {
  const reviewId = parseInt(req.params.id, 10);
  const review   = await db.findById("reviews", reviewId);

  if (!review) return res.status(404).json({ message: "Review not found." });
  if (review.user_id !== req.user.id) return res.status(403).json({ message: "Access denied." });

  const { rating, comment } = req.body;

  const updated = await db.update("reviews", reviewId, {
    rating:  rating  !== undefined ? parseInt(rating, 10) : review.rating,
    comment: comment !== undefined ? comment              : review.comment,
  });

  res.json({ message: "Review updated.", review: updated });
});


const deleteReview = asyncHandler(async (req, res) => {
  const reviewId = parseInt(req.params.id, 10);
  const review   = await db.findById("reviews", reviewId);

  if (!review) return res.status(404).json({ message: "Review not found." });
  if (review.user_id !== req.user.id) return res.status(403).json({ message: "Access denied." });

  await db.delete("reviews", reviewId);
  res.json({ message: "Review deleted." });
});

module.exports = { getReviews, createReview, updateReview, deleteReview };
