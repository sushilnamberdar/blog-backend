// utils/normalizeMongo.js
const normalizeMongoDoc = (input, seen = new WeakSet()) => {
  if (!input || typeof input !== 'object') return input;

  // Prevent circular structures
  if (seen.has(input)) return '[Circular]';
  seen.add(input);

  // If it's a Mongoose document, convert to plain JS object
  if (typeof input.toObject === 'function') {
    input = input.toObject();
  }

  if (Array.isArray(input)) {
    return input.map(item => normalizeMongoDoc(item, seen));
  }

  const obj = {};
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === 'object') {
      // ObjectId handling
      if (value._id && typeof value._id.toString === 'function') {
        obj[key] = value._id.toString();
      }
      // Date handling
      else if (value instanceof Date) {
        obj[key] = value.toISOString();
      }
      // Recursion for nested objects
      else {
        obj[key] = normalizeMongoDoc(value, seen);
      }
    } else {
      obj[key] = value;
    }
  }

  // Convert top-level _id if present
  if (input._id && typeof input._id.toString === 'function') {
    obj._id = input._id.toString();
  }

  return obj;
};

module.exports = normalizeMongoDoc;
