const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Category, Product, User } = require("../models");
const upload = require("../middlewares/uploads");

const categoryImageError = "ÙŠØ¬Ø¨ Ø±ÙØ¹ ØµÙˆØ±Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„";
const DEFAULT_CATEGORY_PRODUCTS_PAGE_SIZE = 50;

async function validateParentCategory(parentId) {
  if (!parentId) {
    return null;
  }

  const parentCategory = await Category.findByPk(parentId);
  if (!parentCategory) {
    return { error: "Ø§Ù„Ù‚Ø³Ù… Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" };
  }

  if (parentCategory.parentId) {
    return { error: "Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ø³Ù… ÙØ±Ø¹ÙŠ Ø¯Ø§Ø®Ù„ Ù‚Ø³Ù… ÙØ±Ø¹ÙŠ Ø¢Ø®Ø±" };
  }

  return { parentCategory };
}

router.post("/categories", upload.array("images", 5), async (req, res) => {
  const { name, name_ar, name_ckb, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Ø§Ø³Ù… Ø§Ù„Ù‚Ø³Ù… Ù…Ø·Ù„ÙˆØ¨" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: categoryImageError });
  }

  try {
    const parentValidation = await validateParentCategory(parentId || null);
    if (parentValidation?.error) {
      return res.status(400).json({ error: parentValidation.error });
    }

    const images = req.files.map((file) => file.filename);
    if (!images.length) {
      return res.status(400).json({ error: categoryImageError });
    }

    const category = await Category.create({
      name,
      name_ar: name_ar || null,
      name_ckb: name_ckb || null,
      parentId: parentId || null,
      images,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/categories", upload.none(), async (req, res) => {
  const all = req.query.all === "true";
  const parentId = req.query.parentId;

  try {
    if (all) {
      const categories = await Category.findAll({
        order: [
          ["parentId", "ASC"],
          ["createdAt", "DESC"],
        ],
      });
      return res.json(categories);
    }

    if (parentId) {
      const subcategories = await Category.findAll({
        where: { parentId },
        order: [["createdAt", "DESC"]],
      });
      return res.json(subcategories);
    }

    const categories = await Category.findAll({
      where: { parentId: null },
      include: [
        {
          model: Category,
          as: "subcategories",
          required: false,
          order: [["createdAt", "DESC"]],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/categories/:id", upload.none(), async (req, res) => {
  const categoryId = req.params.id;

  try {
    const category = await Category.findByPk(categoryId, {
      include: [
        {
          model: Category,
          as: "subcategories",
          required: false,
        },
        {
          model: Category,
          as: "parent",
          required: false,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({ error: "Ø§Ù„Ù‚Ø³Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/categories/:id/subcategories", upload.none(), async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Ø§Ù„Ù‚Ø³Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" });
    }

    const subcategories = await Category.findAll({
      where: { parentId: category.id },
      order: [["createdAt", "DESC"]],
    });

    res.json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/categories/:id/products", async (req, res) => {
  const categoryId = req.params.id;
  const userId = parseInt(req.query.userId) || null;
  let page = parseInt(req.query.page) || 1;
  let pageSize = parseInt(req.query.pageSize, 10);

  if (Number.isNaN(pageSize) || pageSize <= 0) {
    pageSize = DEFAULT_CATEGORY_PRODUCTS_PAGE_SIZE;
  } else if (pageSize > DEFAULT_CATEGORY_PRODUCTS_PAGE_SIZE) {
    pageSize = DEFAULT_CATEGORY_PRODUCTS_PAGE_SIZE;
  }

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  try {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Ø§Ù„Ù‚Ø³Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" });
    }

    if (!category.parentId) {
      return res.json({
        page,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        products: [],
      });
    }

    const include = [
      {
        model: User,
        as: "seller",
        attributes: ["id", "name", "phone", "location", "role", "isVerified", "image"],
        required: false,
      },
    ];

    if (userId) {
      include.push({
        model: User,
        as: "favoritedByUsers",
        where: { id: userId },
        required: false,
        attributes: ["id"],
        through: { attributes: [] },
      });
    }

    const { rows: products, count } = await Product.findAndCountAll({
      where: { categoryId },
      include,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const productsWithFavorite = products.map((product) => {
      const isFavorite = product.favoritedByUsers && product.favoritedByUsers.length > 0;
      const prodJson = product.toJSON();
      prodJson.isFavorite = isFavorite;
      delete prodJson.favoritedByUsers;
      return prodJson;
    });

    res.json({
      page,
      pageSize,
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
      products: productsWithFavorite,
    });
  } catch (error) {
    console.error("Error fetching products for category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  const categoryId = req.params.id;

  try {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Ø§Ù„Ù‚Ø³Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" });
    }

    await category.destroy();
    res.json({ message: "ØªÙ… Ø­Ø°Ù Ø§Ù„Ù‚Ø³Ù… Ø¨Ù†Ø¬Ø§Ø­" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
