/*
 * API sub-router for businesses collection endpoints.
 */

const { Router, application } = require('express')

const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  savePhotoInfo,
  savePhotoFile,
  insertNewPhoto,
  getPhotoById,
  getPhotoInfoById,
  getDownloadStreamByFilename,
  removeUploadedFile,
  saveThumbFile,
  getThumbInfoById,
  getThumbDownloadStreamByFilename
} = require('../models/photo')

const { connectToRabbitMQ, getChannel } = require('./lib/rabbitmq');

const { 
  photoTypes,
  upload
} = require('../server')

const router = Router()

/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('photo'), async (req, res) => {
  if (validateAgainstSchema(req.body, PhotoSchema)) {
    try {
      const photo = {
        contentType: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path,
        userId: req.body.userId,
        businessId: req.body.businessId,
        caption: req.body.caption
      };
      const id = await savePhotoFile(photo);
      await removeUploadedFile(req.file);

      const channel = getChannel();
      channel.sendToQueue('photos', Buffer.from(id.toString()));

      res.status(201).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${req.body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object"
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoInfoById(req.params.id);
    if (photo) {
      // delete photo.path;
      // photo.url = `/media/photos/${photo.filename}`;
      const responseBody = {
        _id: photo._id,
        url: `/media/photos/${photo._id}.jpg` || `/media/photos/${photo._id}.png`,
        contentType: photo.metadata.contentType,
        userId: photo.metadata.userId,
        businessId: photo.metadata.businessId,
        caption: photo.metadata.caption,
        size: photo.metadata.size
      };
      res.status(200).send(responseBody);
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})

// app.use('/media/photos', express.static(`${__dirname}/uploads`));

/*
 * GET /media/photos/{filename} - Route to fetch file data for photos
 */
router.get('/media/photos/:filename', (req, res, next) => {
  getDownloadStreamByFilename(req.params.filename)
    .on('error', (err) => {
      if (err.code === 'ENOENT') {
        next();
      } else {
        next(err);
      }
    })
    .on('file', (file) => {
      res.status(200).type(file.metadata.contentType);
    })
    .pipe(res);
});

/*
 * GET /photos/thumbs/{id} - Route to fetch info about a specific thumbnail.
 */
router.get('/thumbs/:id', async (req, res, next) => {
  try {
    const thumb = await getThumbInfoById(req.params.id)
    if (thumb) {
      delete thumb.path;
      const responseBody = {
        _id: thumb._id,
        url: `/photos/media/thumbs/${thumb.filename}`
      }
      res.status(200).send(responseBody)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch thumbnail.  Please try again later."
    })
  }
});

/*
 * GET /media/thumbs/{filename} - Route to fetch file data for thumbnails.
 */
router.get('/media/thumbs/:filename', (req, res, next) => {
  getThumbDownloadStreamByFilename(req.params.filename)
    .on('error', (err) => {
      if (err.code === 'ENOENT') {
        next();
      } else {
        next(err);
      }
    })
    .on('file', (file) => {
      res.status(200).type(file.metadata.contentType);
    })
    .pipe(res);
});

module.exports = router
