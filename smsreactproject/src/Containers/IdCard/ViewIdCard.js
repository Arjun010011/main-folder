import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Paper,
  Dialog,
  DialogContent,
  DialogActions,
  CircularProgress
} from "@material-ui/core";

import { PhotoCamera } from "@material-ui/icons";

import DropDownWithSearchApi from "Components/DropDownWithSearchApi";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import Swal from "sweetalert2";
import { Redirect, useHistory, useLocation } from "react-router-dom/cjs/react-router-dom.min";
import { Actions } from "Constants/permissions";

const ViewIdCard = ({update =false}) => {

  const [studentFields, setStudentFields] = useState({});
  const [crop, setCrop] = useState(() => {
  return localStorage.getItem("crop") !== null
    ? Number(localStorage.getItem("crop"))
    : 1;
});

const [bgremove, setBgremove] = useState(() => {
  return localStorage.getItem("bgremove") !== null
    ? Number(localStorage.getItem("bgremove"))
    : 1;
});
  const [fieldLabels, setFieldLabels] = useState({});
  const [imageToggle,setImageToggle] = useState(0)
  const [selectedFields, setSelectedFields] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [idCardParams, setIdCardParams] = useState(null);
  const [uploadedImageURL, setUploadedImageURL] = useState(null);
const [useUploaded, setUseUploaded] = useState(false);
const [baseImage, setBaseImage] = useState(null);
const [baseProcessedImage, setBaseProcessedImage] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editId,setEditId] = useState(0)
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [bgColor, setBgColor] = useState(() => {
  return localStorage.getItem("bgColoridcard") || "#ffffff";
});
  const location = useLocation();
  const navigate = useHistory()
  const [show,setShow] = useState(false)
  const [uploadData, setUploadData] = useState({
  id: null,
  url: null
});

const [idCardUploadData, setIdCardUploadData] = useState({
  id: null,
  url: null
});

  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchSchool();
  }, []);

  useEffect(() => {
  localStorage.setItem("crop", crop);
}, [crop]);

useEffect(() => {
  localStorage.setItem("bgremove", bgremove);
}, [bgremove]);
useEffect(() => {
  localStorage.setItem("bgColoridcard", bgColor);
}, [bgColor]);

  useEffect(() => {
  if (update) {
    const params = new URLSearchParams(location.search);

    const studentId = params.get("student_id");
    const academicYear = params.get("academic_year");

    if (studentId && academicYear) {
      getEditData(studentId, academicYear);
    }
  }
}, [update, location.search]);

  const fetchSchool = async () => {
    try {
      await getRequest(GET_URL.institute.api);
    } catch (err) {
      console.error(err);
    }
  };

  const getEditData = async (studentId, academicYear) => {
  try {
    const url = `${GET_URL.studentidcardupdate.api}${studentId}/`;
    const params = {
      student: studentId,
      academicyear: academicYear
    };

    const response = await getRequest(url, params);
    const data = response.data;
    console.log(data)

    // map fields (same structure as getStudentInfo)
    const fields = {
      name: data.name,
      admission_no: data.admission_no,
      student_class: data.student_class,
      roll_no: data.roll_no,
      dob: data.dob,
      father_name: data.father_name,
      mobile: data.mobile,
      blood_group: data.blood_group,
      pic_url: data.processed_image_details.file
    };

    const labels = {
      name: "Name",
      admission_no: "Admission No",
      student_class: "Class",
      roll_no: "Roll No",
      dob: "DOB",
      father_name: "Father Name",
      mobile: "Mobile",
      blood_group: "Blood Group"
    };

    const paramsObj = {
      academic_year: academicYear,
      file_name: data.file_name || "id_card",
      student_ids: [studentId],
    };

    setEditId(data.id)

    setStudentFields(fields);
    setFieldLabels(labels);
    setSelectedFields(Object.keys(fields));
    setIdCardParams(paramsObj);
    setPhotoPreview(data.pic_url || null);

    setIsDirty(false);

    getPreview(paramsObj, fields);

  } catch (err) {
    console.error(err);
  }
};
  // =============================
  // STUDENT SELECT
  // =============================
  const handleStudentChange = (student) => {
    if (student && student.id) {
      getStudentInfo(student.id);
    }
  };

  const getStudentInfo = async (id) => {
    try {
      const res = await getRequest(`${GET_URL.getallstudents.api}${id}/`);
      const data = res.data.data;

      const fields = {
        name: `${data.first_name || ""} ${data.last_name || ""}`,
        admission_no: data.admission_num,
        student_class: data.current_standard_name,
        roll_no: data.roll_number || "N/A",
        dob: data.dob,
        father_name: data.student_parent?.parent?.father_name,
        mobile: data.mobile_num,
        blood_group: data.student_details?.blood_group || "O+",
      };

      const labels = {
        name: "Name",
        admission_no: "Admission No",
        student_class: "Class",
        roll_no: "Roll No",
        dob: "DOB",
        father_name: "Father Name",
        mobile: "Mobile",
        blood_group: "Blood Group"
      };

      const params = {
        academic_year: data.student_details?.entry_academic_year,
        file_name: `${data.current_standard_name}-${data.student_details.section_name}-${data.first_name}`,
        student_ids: [data.id],
      };

      setStudentFields(fields);
      setFieldLabels(labels);
      setSelectedFields(Object.keys(fields));
      setIdCardParams(params);
      setIsDirty(false);

      getPreview(params, fields);
      setShow(true)

    } catch (err) {
      console.error(err);
    }
  };

  // =============================
  // PREVIEW
  // =============================
  const getPreview = async (params, fields) => {
    try {
      setPreviewLoading(true);
  
      const res = await postRequest(
        `${POST_URL.generateidcard.api}?preview=1`,
        {
          academic_year: params.academic_year,
          document_type: "pdf",
          file_name: params.file_name,
          student_ids: params.student_ids,
          student_data: {
            ...fields,
            bgcolor: bgColor   // ✅ added
          }
        },
        { responseType: "blob" }
      );
  
      const blob = new Blob([res.data], { type: "application/pdf" });
      setFileURL(URL.createObjectURL(blob));
  
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // =============================
  // FIELD CHANGE (NO API)
  // =============================
  const handleChange = (field, value) => {
    setStudentFields(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  // =============================
  // APPLY CHANGES
  // =============================
  const applyChanges = () => {
    if (!idCardParams) return;

    getPreview(idCardParams, studentFields);
    setIsDirty(false);
  };

  // =============================
  // SAVE DATABASE
  // =============================
  const saveToDatabase = async () => {
  if (!idCardParams) return;

  try {
    setSaving(true);
    let res;

    if (update) {
      const payload = {
        student: idCardParams.student_ids[0],
        academic_year: idCardParams.academic_year,
        image: processedImage,
        processed_image: image 
      };
      res = await putRequest(`${PUT_URL.studentidcardupdate.api}${editId}/`, payload);
    } else {
      const payload = {
        student: idCardParams.student_ids[0],
        academic_year: idCardParams.academic_year,
        ...studentFields,
        image: processedImage,
        processed_image: image 
      };
      res = await postRequest(POST_URL.studentidcardupdate.api, payload);
    }

    if (res.status === 200 || res.status === 201) {
      Swal.fire("Success", update ? "Updated successfully" : "Saved to database", "success");
      
      if (update) {
        navigate.push(Actions.idcard.view.url);
      } else {
        // --- RESET THE PAGE FOR NEW ENTRY ---
        resetForm();
      }
    } else {
      Swal.fire("Error", "Failed", "error");
    }
  } catch (err) {
    console.error(err);
  } finally {
    setSaving(false);
  }
};

  const resetForm = () => {
  setStudentFields({});
  setFieldLabels({});
  setSelectedFields([]);
  setIdCardParams(null);
  setFileURL(null);           // Removes the PDF preview
  setPhotoPreview(null);      // Removes the photo thumbnail
  setUploadedImageURL(null);  // Removes the swapped image preview
  setImage(null);
  setProcessedImage(null);
  setIsDirty(false);
  setShow(false);             // Hides the conditional UI parts
  setEditId(0);
  // Optional: Reset BG color if desired
  // setBgColor("#ffffff"); 
};

  // =============================
  // PHOTO UPLOAD
  // =============================
  const handleUploadPhoto = async (file) => {
  if (!file || !idCardParams) return;

  try {
    setPreviewLoading(true);
    setPhotoUploading(true);

    const form = new FormData();
    form.append("student_id", idCardParams.student_ids[0]);
    form.append("file", file);

    // 1. Upload the raw file
    const res = await postRequest(POST_URL.uploads.api, form);
    const rawData = {
      id: res.data.data.id,
      url: res.data.data.file
    };

    // 2. Process the file (BG remove/Crop)
    const photoRes = await postRequest(
      POST_URL.idcardphotoupload.api,
      {
        student_id: idCardParams.student_ids[0],
        file: rawData.url,
        bgcolor: bgColor,
        crop,
        bgremove
      }
    );
    const processedData = {
      id: photoRes.data.data.id,
      url: photoRes.data.data.file
    };

    // Store both distinctly
    setUploadData(rawData);           // Raw/Original
    setIdCardUploadData(processedData); // Processed

    // Default: Use the PROCESSED image for the ID Card
    setImage(processedData.id);
    setProcessedImage(rawData.id);
    setUploadedImageURL(processedData.url);
    setImageToggle(0); // 0 represents Processed

    return processedData.url;

  } finally {
    setPhotoUploading(false);
    setPreviewLoading(false);
  }
};

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));

    const url = await handleUploadPhoto(file);

    if (url) {  // ✅ store url

  const updated = { ...studentFields, pic_url: url };
  setStudentFields(updated);

  if (idCardParams) {
    getPreview(idCardParams, updated);
  }
  setUseUploaded(false);   // ✅ reset
}
  };

  const handleUseThisImage = () => {
  if (!uploadData.id || !idCardUploadData.id || !idCardParams) return;

  // Toggle state: 0 = Processed, 1 = Original
  const newToggle = imageToggle === 0 ? 1 : 0;
  setImageToggle(newToggle);

  let activeId, secondaryId, activeUrl;

  if (newToggle === 1) {
    // Switch to ORIGINAL
    activeId = uploadData.id;
    secondaryId = idCardUploadData.id;
    activeUrl = uploadData.url;
  } else {
    // Switch to PROCESSED
    activeId = idCardUploadData.id;
    secondaryId = uploadData.id;
    activeUrl = idCardUploadData.url;
  }

  // Update backend payload states
  setImage(activeId);
  setProcessedImage(secondaryId);
  
  // Update UI and Preview
  setUploadedImageURL(activeUrl);
  const updated = { ...studentFields, pic_url: activeUrl };
  setStudentFields(updated);
  getPreview(idCardParams, updated);
};

  // =============================
  // CAMERA
  // =============================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);

    } catch (err) {
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;

      setCapturedBlob(blob);
      setPhotoPreview(URL.createObjectURL(blob));
      setConfirmOpen(true);
      stopCamera();
    });
  };

  const handleConfirmPhoto = async () => {
  if (!capturedBlob) return;

  try {
    setPhotoUploading(true); // ✅ START LOADER

    const url = await handleUploadPhoto(capturedBlob);

    if (url) {
      const updated = { ...studentFields, pic_url: url };
      setStudentFields(updated);

      if (idCardParams) {
        await getPreview(idCardParams, updated);
      }
    }

    setConfirmOpen(false);
    setUseUploaded(false);

  } catch (err) {
    console.error(err);
  } finally {
    setPhotoUploading(false); // ✅ STOP LOADER
  }
};
  console.log(show)

  return (
    <Box p={4} bgcolor="#f4f7f9">
      <Box mb={2}>
  <Typography variant="h5" className="heading">
    ID Card {update?'Update':'Create'}
  </Typography>
</Box>
      <Grid container spacing={4}>
        

        {/* LEFT */}
        <Grid item xs={12} md={5}>
          <Paper style={{ padding: 20 }}>

            <Typography variant="h6">Configuration</Typography>

            {!update&&<DropDownWithSearchApi onStudentChange={handleStudentChange} />}

            <><Box mt={2}>
              <Button fullWidth variant="contained" onClick={startCamera} disabled={!idCardParams}>
                Open Camera
              </Button>
            </Box>

            <Box mt={2}>
              <Button fullWidth variant="outlined" component="label" disabled={!idCardParams}>
                Upload Photo
                <input hidden type="file" onChange={handleFileUpload} />
              </Button>
              <Box mt={2}>
                <Typography variant="subtitle2">Image Options</Typography>

                <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                  <Typography>Crop</Typography>
                  <input
                    type="checkbox"
                    checked={crop === 1}
                    onChange={(e) => setCrop(e.target.checked ? 1 : 0)}
                  />
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                  <Typography>Background Remove</Typography>
                  <input
                    type="checkbox"
                    checked={bgremove === 1}
                    onChange={(e) => setBgremove(e.target.checked ? 1 : 0)}
                  />
                </Box>
              </Box>
              <Box mt={2}>
              <Typography variant="subtitle2">Background Color</Typography>

              <input
                type="color"
                value={bgColor}
                disabled={update}   // ✅ prevent editing
                onChange={(e) => {
                  setBgColor(e.target.value);
                  setIsDirty(true);
                }}
              />
            </Box>
            </Box>

            <Divider style={{ margin: 20 }} />

            {selectedFields.map(field => (
              <Box key={field} mb={2}>
                <TextField
                  fullWidth
                  label={fieldLabels[field]}
                  value={studentFields[field] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  disabled={update}   // ✅ disable in update mode
                />
              </Box>
            ))}

            {!update && (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                disabled={!isDirty}
                onClick={applyChanges}
              >
                Apply Changes
              </Button>
            )}</>

          </Paper>
        </Grid>

        {/* RIGHT */}
        <Grid item xs={12} md={7}>
          <Paper style={{ padding: 20, textAlign: "center" }}>

            {previewLoading ? (
              <CircularProgress />
            ) : fileURL ? (
              <>
              
              <Box position="relative" display="inline-block">
                {uploadedImageURL && (
    <Box
      position="absolute"
      top={10}
      right={10}
      bgcolor="#fff"
      p={1}
      borderRadius={4}
      boxShadow={2}
    >

      <Button
        size="small"
        variant="contained"
        color="primary"
        onClick={handleUseThisImage}
        style={{ marginTop: 5 }}
      >
        Swap Image
      </Button>
    </Box>
  )}
  
  <iframe
    title="preview"
    src={fileURL}
    style={{ width: 300, height: 480 }}
  />

  
</Box>

                <Box mt={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    onClick={saveToDatabase}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save to Database"}
                  </Button>
                </Box>
              </>
            ) : (
              <Typography>Select student</Typography>
            )}

          </Paper>
        </Grid>

      </Grid>

      {/* CAMERA */}
      <Dialog open={cameraOpen} onClose={stopCamera}>
        <DialogContent>
          <video ref={videoRef} autoPlay style={{ width: "100%" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={capturePhoto}>Capture</Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM */}
      <Dialog open={confirmOpen}>
        <DialogContent>
          {photoPreview && <img src={photoPreview} style={{ width: "100%" }} />}
        </DialogContent>
        <Button
  onClick={() => {
    setConfirmOpen(false);
    setCapturedBlob(null);
    startCamera();
  }}
  disabled={photoUploading}
>
  Retake
</Button>

<Button
  onClick={handleConfirmPhoto}
  color="primary"
  variant="contained"
  disabled={photoUploading}
>
  {photoUploading ? "Uploading..." : "Confirm"}
</Button>
      </Dialog>

    </Box>
  );
};

export default ViewIdCard;