import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['MOMO'], default: 'MOMO' },
    orderId: { type: String, required: true, unique: true, index: true, trim: true },
    requestId: { type: String, required: true, index: true, trim: true },
    packageId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING'
    },
    resultCode: { type: Number, default: null },
    message: { type: String, trim: true },
    payUrl: { type: String, trim: true },
    deeplink: { type: String, trim: true },
    qrCodeUrl: { type: String, trim: true },
    transId: { type: String, trim: true },
    isPointCredited: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ userId: 1, createdAt: -1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

export default PaymentTransaction;
