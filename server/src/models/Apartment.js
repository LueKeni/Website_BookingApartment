import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
	{
		city: { type: String, required: true, trim: true },
		district: { type: String, required: true, trim: true },
		address: { type: String, required: true, trim: true },
		latitude: { type: Number, min: -90, max: 90 },
		longitude: { type: Number, min: -180, max: 180 }
	},
	{ _id: false }
);

const detailsSchema = new mongoose.Schema(
	{
		pricePerSqm: { type: Number, min: 0 },
		bedrooms: { type: Number, min: 0 },
		bathrooms: { type: Number, min: 0 },
		floorNumber: { type: Number, min: 0 },
		buildingBlock: { type: String, trim: true },
		doorDirection: { type: String, trim: true },
		balconyDirection: { type: String, trim: true },
		furnitureStatus: { type: String, trim: true },
		legalStatus: { type: String, trim: true }
	},
	{ _id: false }
);

const apartmentSchema = new mongoose.Schema(
	{
		agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		title: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },
		transactionType: { type: String, enum: ['SALE', 'RENT'], required: true },
		roomType: {
			type: String,
			enum: ['STUDIO', '1BR', '2BR', '3BR', 'PENTHOUSE', 'DUPLEX'],
			required: true
		},
		price: { type: Number, required: true, min: 0 },
		area: { type: Number, required: true, min: 0 },
		location: { type: locationSchema, required: true },
		details: { type: detailsSchema, default: {} },
		images: [{ type: String, trim: true }],
		boostedAt: { type: Date, default: null },
		boostCount: { type: Number, default: 0, min: 0 },
		status: {
			type: String,
			enum: ['AVAILABLE', 'SOLD', 'RENTED', 'HIDDEN'],
			default: 'AVAILABLE'
		}
	},
	{ timestamps: true }
);

const Apartment = mongoose.model('Apartment', apartmentSchema);

export default Apartment;
