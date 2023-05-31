/*
 * API sub-router for businesses collection endpoints.
 */

const { Router, application } = require('express')

const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  savePhotoInfo,
  insertNewPhoto,
  getPhotoById,
  getPhotoInfoById
} = require('../models/photo')

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
      }
      const id = await savePhotoInfo(photo);
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
      delete photo.path;
      photo.url = `/media/photos/${photo.filename}`;
      res.status(200).send(photo);
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

app.use('/media/images', express.static(`${__dirname}/uploads`));

module.exports = router
