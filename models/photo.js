/*
 * Photo schema and data accessor methods.
 */
const fs = require('fs');

const { ObjectId, GridFSBucket } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
  businessId: { required: true },
  caption: { required: false }
}
exports.PhotoSchema = PhotoSchema

exports.savePhotoInfo = async function (photo) {
  const db = getDBReference();
  const collection = db.collection('photos');
  const result = await collection.insertOne(photo);
  return result.insertedId;
};

exports.savePhotoFile = function (photo) {
  return new Promise((resolve, reject) => {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });

    const metadata = {
      contentType: photo.contentType,
      userId: photo.userId,
      businessId: photo.businessId,
      caption: photo.caption
    };

    const uploadStream = bucket.openUploadStream(
      photo.filename,
      { metadata: metadata }
    );

    fs.createReadStream(photo.path)
      .pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', (result) => {
        resolve(result._id);
      });
  });
};

exports.removeUploadedFile = function (file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/*
 * Executes a DB query to insert a new photo into the database.  Returns
 * a Promise that resolves to the ID of the newly-created photo entry.
 */
async function insertNewPhoto(photo) {
  photo = extractValidFields(photo, PhotoSchema)
  photo.businessId = ObjectId(photo.businessId)
  const db = getDbReference()
  const collection = db.collection('photos')
  const result = await collection.insertOne(photo)
  return result.insertedId
}
exports.insertNewPhoto = insertNewPhoto

/*
 * Executes a DB query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
async function getPhotoById(id) {
  const db = getDbReference()
  const collection = db.collection('photos')
  if (!ObjectId.isValid(id)) {
    return null
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray()
    return results[0]
  }
}
exports.getPhotoById = getPhotoById

exports.getPhotoInfoById = async function (id) {
  const db = getDBReference();
  // const collection = db.collection('photos');
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });

  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket
      .find({ _id: new ObjectId(id) })
      .toArray();
    return results[0];
  }
};

exports.getDownloadStreamByFilename = function (filename) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });
  return bucket.openDownloadStreamByName(filename);
};

exports.getDownloadStreamById = function (id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    return bucket.openDownloadStream(new ObjectId(id));
  }
};

exports.updatePhotoSizeById = async function (id, size) {
  const db = getDBReference();
  const collection = db.collection('photos.files');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { "metadata.size": size }}
    );
    return result.matchedCount > 0;
  }
};

// Thumbnail functions
exports.saveThumbFile = function (thumb) {
  return new Promise((resolve, reject) => {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });

    const metadata = {
      contentType: 'image/jpeg'
    };

    const uploadStream = bucket.openUploadStream(
      thumb.filename,
      { metadata: metadata }
    );

    fs.createReadStream(thumb.path)
      .pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', (result) => {
        resolve(result._id);
      });
  });
};

exports.getThumbInfoById = async function (id) {
  const db = getDBReference();
  // const collection = db.collection('photos');
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });

  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket
      .find({ _id: new ObjectId(id) })
      .toArray();
    return results[0];
  }
};
