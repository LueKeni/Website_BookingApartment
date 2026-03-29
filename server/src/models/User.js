import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const agentInfoSchema = new mongoose.Schema(
	{
		location: { type: String, trim: true },
		responseRate: { type: Number, default: 0, min: 0, max: 100 },
		successDeals: { type: Number, default: 0, min: 0 },
		availableDays: [{ type: String, trim: true }]
	},
	{ _id: false }
);

const userSchema = new mongoose.Schema(
	{
		fullName: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, trim: true, lowercase: true },
		password: { type: String, required: true, minlength: 6 },
		phone: { type: String, trim: true },
		avatar: { type: String, trim: true },
		role: {
			type: String,
			enum: ['USER', 'AGENT', 'ADMIN'],
			default: 'USER'
		},
		status: {
			type: String,
			enum: ['ACTIVE', 'BANNED'],
			default: 'ACTIVE'
		},
		agentInfo: {
			type: agentInfoSchema,
			default: undefined
		},
		favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }]
	},
	{ timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
	if (!this.isModified('password')) {
		return next();
	}
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
	return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
