const mongoose = require('mongoose');

// Este es el "molde" para todos los productos
const productSchema = new mongoose.Schema({
    // Campos que tu frontend admin_inv ya usa:
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    stockQty: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, min: 0, default: 0 },
    description: { type: String, trim: true },
    images: [{ type: String }], // Un array de URLs de imágenes
    active: { type: Boolean, default: true },

    descuento: {
        tipo_descuento: { type: String, enum: ['PORCENTAJE', 'MONTO'], default: null },
        valor: { type: Number, default: null },
        nombre_promo: { type: String, default: null },
        activa: { type: Boolean, default: false },
        id_promocion_supabase: { type: String, default: null}
    },

    
}, {
    timestamps: true // Esto agrega 'createdAt' y 'updatedAt' automáticamente
});

// Creamos el modelo y lo exportamos
const Product = mongoose.model('Product', productSchema);

module.exports = Product;