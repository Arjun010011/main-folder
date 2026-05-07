import React, { Component } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress
} from '@material-ui/core';
import Webcam from 'react-webcam';
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

// Alert component
function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

// Constants for file validation
const image_formats = {
  type: ['jpg', 'jpeg', 'png', 'gif'],
  error: 'Only JPG, JPEG, PNG and GIF files are allowed'
};
const maxFileSize = {
  img: {
    size: 5 * 1024 * 1024, // 5MB
    errorText: 'File size exceeds 5MB limit'
  }
};
const COMPRESSION_THRESHOLD = 0.95 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / 1048576).toFixed(2) + ' MB';
};

const compressImage = (imageDataUrl, initialQuality = 0.7) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const compressWithQuality = (quality) => {
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', quality);
        });
      };

      const tryCompression = async () => {
        const originalBlob = await compressWithQuality(1.0);
        const originalSize = originalBlob.size;
        let quality = initialQuality;
        let blob = await compressWithQuality(quality);

        while (blob.size > COMPRESSION_THRESHOLD && quality > 0.3) {
          quality -= 0.1;
          blob = await compressWithQuality(quality);
        }

        if (!blob) {
          reject(new Error('Canvas to Blob conversion failed'));
          return;
        }

        console.log('Image compression:');
        console.log('Original size:', formatFileSize(originalSize), `(${originalSize} bytes)`);
        console.log('Compressed size:', formatFileSize(blob.size), `(${blob.size} bytes)`);
        console.log('Compression ratio:', (100 - (blob.size / originalSize * 100)).toFixed(2) + '%');
        console.log('Final quality setting:', quality.toFixed(2));

        resolve({
          url: URL.createObjectURL(blob),
          originalSize,
          compressedSize: blob.size,
          compressionRatio: (100 - (blob.size / originalSize * 100)).toFixed(2),
          quality: quality.toFixed(2)
        });
      };

      tryCompression().catch(reject);
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = imageDataUrl;
  });
};

class CameraUpload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showImageOptionDialog: false,
      showCameraDialog: false,
      capturedImage: null,
      uploadedFileName: null,
      uploadedFile: null,
      open: false,
      alertData: '',
      alertSeverity: 'error',
      enableUploadIcons: true,
      cameraError: false,
      imageCompressed: false,
      isUploading: false,
      compressionInfo: null,
      uploadProgress: 0,
      uploadStatus: '',
      uploadComplete: false,
      alertInDialog: false
    };
    this.webcamRef = React.createRef();
  }

  handleOpen = () => {
    this.setState({ showImageOptionDialog: true });
  };

  handleOptionSelect = (option) => {
    if (option === 'capture') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.setState({
          showImageOptionDialog: false,
          open: true,
          alertData: "Camera access is not supported in your browser. Please try uploading an image instead."
        });
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          this.setState({ 
            showImageOptionDialog: false,
            showCameraDialog: true,
            cameraError: false
          });
        })
        .catch(error => {
          console.error("Camera access error:", error);
          this.setState({
            showImageOptionDialog: false,
            open: true,
            alertData: "Could not access camera. Please check camera permissions or try uploading an image instead."
          });
        });
    } else if (option === 'upload') {
      document.getElementById('upload-pic-' + this.props.id).click();
      this.setState({ showImageOptionDialog: false });
    }
  };

  getImageSizeFromDataUrl = (dataUrl) => {
    const base64String = dataUrl.split(',')[1];
    return base64String.length * 0.75;
  };

  handleCapture = async () => {
    try {
      if (!this.webcamRef || !this.webcamRef.current) {
        throw new Error("Camera is not initialized properly");
      }
      const imageSrc = this.webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }
      const estimatedSize = this.getImageSizeFromDataUrl(imageSrc);
      console.log('Webcam capture - estimated size:', formatFileSize(estimatedSize), `(${estimatedSize} bytes)`);
      this.setState({
        showCameraDialog: false,
        isUploading: true,
        uploadProgress: 10,
        uploadStatus: "Preparing image..."
      });

      let finalImageSrc = imageSrc;
      let compressionInfo = null;

      if (estimatedSize > COMPRESSION_THRESHOLD) {
        try {
          compressionInfo = await compressImage(imageSrc, 0.7);
          finalImageSrc = compressionInfo.url;
          this.setState({
            imageCompressed: true,
            compressionInfo: {
              originalSize: compressionInfo.originalSize,
              compressedSize: compressionInfo.compressedSize,
              compressionRatio: compressionInfo.compressionRatio,
              quality: compressionInfo.quality
            },
            capturedImage: finalImageSrc
          });
        } catch (error) {
          console.error('Image compression failed:', error);
        }
      } else {
        this.setState({ capturedImage: finalImageSrc });
      }

      this.handleSaveImage(finalImageSrc);

    } catch (error) {
      console.error("Capture error:", error);
      this.setState({
        alertInDialog: true,
        alertData: "Failed to capture image. Please try again or use the upload option.",
        alertSeverity: 'error',
        showCameraDialog: false
      });
      setTimeout(() => {
        this.setState({ alertInDialog: false });
      }, 3000);
    }
  };

  handleUploadChange = async (event) => {
    if (!event.target.files || !event.target.files[0]) return;
    const file = event.target.files[0];
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (!image_formats.type.includes(fileExtension)) {
      this.setState({
        alertInDialog: true,
        alertData: image_formats.error,
        alertSeverity: 'error'
      });
      setTimeout(() => {
        this.setState({ alertInDialog: false });
      }, 3000);
      return;
    }

    if (file.size > maxFileSize.img.size) {
      this.setState({
        alertInDialog: true,
        alertData: maxFileSize.img.errorText,
        alertSeverity: 'error'
      });
      setTimeout(() => {
        this.setState({ alertInDialog: false });
      }, 3000);
      return;
    }

    console.log('Original file size:', formatFileSize(file.size), `(${file.size} bytes)`);
    this.setState({
      alertInDialog: true,
      alertData: "Processing image...",
      alertSeverity: 'info',
      enableUploadIcons: false
    });

    const reader = new FileReader();
    reader.onloadend = async () => {
      this.setState({ capturedImage: reader.result });
      let imageData = reader.result;

      let needsCompression = file.size > COMPRESSION_THRESHOLD;
      let compressionInfo = null;

      if (needsCompression) {
        try {
          compressionInfo = await compressImage(reader.result, 0.7);
          imageData = compressionInfo.url;
          this.setState({
            imageCompressed: true,
            compressionInfo: {
              originalSize: compressionInfo.originalSize,
              compressedSize: compressionInfo.compressedSize,
              compressionRatio: compressionInfo.compressionRatio,
              quality: compressionInfo.quality
            },
            capturedImage: imageData
          });
        } catch (error) {
          console.error('Image compression failed:', error);
        }
      }

      this.setState({
        alertInDialog: false
      });

      this.handleSaveImage(imageData);

    };
    reader.readAsDataURL(file);
  };

  handleSaveImage = async (imageDataUrl) => {
    try {
      const img = new Image();
      img.src = imageDataUrl;
      await new Promise(resolve => img.onload = resolve);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      

      const blob = await new Promise((resolve) => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
      });

      

      const file = new File([blob], "profile.jpg", { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      const formData = new FormData();
      formData.append("file", file);

      const response = await postRequest(POST_URL.uploads.api, formData, this.props);

      if (response?.status === 200) {
        
        const fileId = response.data.data.id;

        if (this.props.studentUpdateCallback) {
          this.props.studentUpdateCallback({
            preview: previewUrl,
            profile_pic: fileId,
            profile_pic_name: file.name
          });
        }

        setTimeout(() => {
          this.setState({
            capturedImage: null,
            imageCompressed: false,
            isUploading: false,
            compressionInfo: null,
            uploadProgress: 0,
            uploadStatus: "",
            uploadComplete: false
          });
        }, 1500);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error saving image:", error);
      this.setState({
        alertInDialog: true,
        alertData: "Failed to upload image. Please try again.",
        alertSeverity: 'error',
        isUploading: false,
        uploadProgress: 0,
        uploadStatus: ""
      });
    }
  };

  handleAlertClose = () => {
    this.setState({ open: false });
  };

  handleClose = (dialogType) => {
    this.setState({ [dialogType]: false });
  };

  render() {
    const {
      showImageOptionDialog,
      showCameraDialog,
      alertInDialog,
      alertData,
      alertSeverity,
      isUploading,
      uploadProgress,
      uploadStatus
    } = this.state;

    return (
      <>
        {/* Image Option Dialog */}
        <Dialog 
          open={showImageOptionDialog} 
          onClose={() => this.handleClose('showImageOptionDialog')}
          PaperProps={{
            style: { borderRadius: '8px', maxWidth: '350px' }
          }}
        >
          <DialogTitle style={{ textAlign: 'center', paddingBottom: '8px' }}>
            <Typography variant="h6">Profile Picture</Typography>
            <Typography variant="body2" color="textSecondary">
              Choose how you want to add your photo
            </Typography>
          </DialogTitle>
          <DialogContent style={{ padding: '0 24px 24px' }}>
            <Box display="flex" flexDirection="column" style={{ gap: '16px' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => this.handleOptionSelect('capture')}
                fullWidth
                style={{ 
                  padding: '12px',
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontSize: '16px'
                }}
                startIcon={<i className="fa fa-camera" aria-hidden="true"></i>}
              >
                Take Photo with Camera
              </Button>
              <Button 
                variant="outlined"
                color="primary"
                onClick={() => this.handleOptionSelect('upload')}
                fullWidth
                style={{ 
                  padding: '12px',
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontSize: '16px'
                }}
                startIcon={<i className="fa fa-upload" aria-hidden="true"></i>}
              >
                Upload from Device
              </Button>
            </Box>
          </DialogContent>
          <DialogActions style={{ justifyContent: 'center', padding: '0 24px 16px' }}>
            <Button 
              onClick={() => this.handleClose('showImageOptionDialog')}
              style={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Camera Dialog */}
        <Dialog 
          open={showCameraDialog} 
          onClose={() => this.handleClose('showCameraDialog')}
          maxWidth="md"
          PaperProps={{
            style: { borderRadius: '8px' }
          }}
        >
          <DialogTitle style={{ textAlign: 'center', paddingBottom: '8px' }}>
            <Typography variant="h6">Take Your Photo</Typography>
            <Typography variant="body2" color="textSecondary">
              Position your face in the center of the frame
            </Typography>
          </DialogTitle>
          <DialogContent style={{ 
            padding: '0',
            backgroundColor: '#000',
            position: 'relative',
            width: '500px',
            height: '500px'
          }}>
            <Webcam
              audio={false}
              ref={this.webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 500,
                height: 500,
                facingMode: "user"
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onUserMediaError={(error) => {
                console.error("Webcam error:", error);
                this.setState({
                  open: true,
                  alertData: "Could not access camera. Please check camera permissions or try uploading an image instead.",
                  showCameraDialog: false
                });
              }}
            />
            <Box 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '250px',
                height: '250px',
                border: '2px dashed rgba(255, 255, 255, 0.7)',
                borderRadius: '4px',
                pointerEvents: 'none'
              }}
            />
          </DialogContent>
          <DialogActions style={{ padding: '16px 24px', justifyContent: 'space-between' }}>
            <Button 
              onClick={() => this.handleClose('showCameraDialog')}
              style={{ 
                marginRight: '16px',
                padding: '8px 24px'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={this.handleCapture}
              color="primary"
              variant="contained"
              style={{ 
                padding: '8px 32px',
                borderRadius: '4px'
              }}
              startIcon={<i className="fa fa-camera" aria-hidden="true"></i>}
            >
              Capture
            </Button>
          </DialogActions>
        </Dialog>

        

        {/* Inline Alert */}
        {alertInDialog && (
          <Snackbar open autoHideDuration={3000} onClose={() => this.setState({ alertInDialog: false })}>
            <Alert severity={alertSeverity}>{alertData}</Alert>
          </Snackbar>
        )}

        {/* Global Alert */}
        <Snackbar open={this.state.open} autoHideDuration={3000} onClose={this.handleAlertClose}>
          <Alert onClose={this.handleAlertClose} severity={this.state.alertSeverity}>
            {this.state.alertData}
          </Alert>
        </Snackbar>

        {/* Hidden Input for Upload */}
        <input
          type="file"
          id={`upload-pic-${this.props.id}`}
          accept="image/*"
          onChange={this.handleUploadChange}
          style={{ display: 'none' }}
        />
      </>
    );
  }
}

export default CameraUpload;