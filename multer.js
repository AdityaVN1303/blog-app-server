const multer = require('multer');

const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

const upload = multer(
    { storage: storage ,
      limits: { fileSize: 1024 * 100 }
    }
);

module.exports = upload