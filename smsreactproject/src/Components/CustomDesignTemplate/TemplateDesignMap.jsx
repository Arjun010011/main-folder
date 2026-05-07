import React, { useState, useEffect } from "react";
import { Link, withRouter } from "react-router-dom";
import {
  Paper,
  Grid,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import LoadingGif from "Components/LoadingGif";
import Swal from "sweetalert2";

const TemplateDesignMap = (props) => {
  const [mappings, setMappings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [errors, setErrors] = useState({});

  const mapApi = GET_URL.customdesigntemplatemap?.api;
  const templateApi = GET_URL.customdesigntemplate?.api;
  const postMapApi = POST_URL.customdesigntemplatemap?.api;
  const delMapApi = DEL_URL.customdesigntemplatemap?.api;

  useEffect(() => {
    loadMappings();
    loadTemplates();
  }, []);

  const loadMappings = () => {
    if (!mapApi) return;
    setLoading(true);
    getRequest(mapApi, props)
      .then((response) => {
        const data = response?.data ?? response;
        const list = Array.isArray(data) ? data : data?.data ?? data?.results ?? [];
        setMappings(Array.isArray(list) ? list : []);
      })
      .catch(() => setMappings([]))
      .finally(() => setLoading(false));
  };

  const loadTemplates = () => {
    if (!templateApi) return;
    getRequest(templateApi, { ...props, module: "marks_card" })
      .then((response) => {
        const data = response?.data ?? response;
        const list = Array.isArray(data) ? data : data?.data ?? data?.results ?? [];
        setTemplates(Array.isArray(list) ? list : []);
      })
      .catch(() => setTemplates([]));
  };

  const validate = () => {
    const next = {};
    if (!keyValue || !String(keyValue).trim()) {
      next.key = "Key is required.";
    }
    if (!selectedTemplateId) {
      next.template = "Template design is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async() => {
    if (!validate()) return;
    if (!postMapApi) {
      alert("Template map API not configured");
      return;
    }

    setSubmitting(true);
    const payload = {
      key: keyValue.trim(),
      template: Number(selectedTemplateId),
    };
    const response = await postRequest(postMapApi, payload, props)
    console.log(response);
    if(response){
      Swal.fire({
        icon : 'success',
        title : 'Mapping saved successfully',
        showConfirmButton : false,
        timer : 1500,
      })
      setKeyValue("");
      setSelectedTemplateId("");
      setErrors({});
      loadMappings();
    } else {
      Swal.fire({
        icon : 'error',
        title : 'Failed to save mapping',
        text : response?.data?.message || response?.data?.detail || "Failed to save mapping",
        showConfirmButton : true,
      })
    }
    setSubmitting(false);
  };

  const handleDelete = (id) => {
    if (!delMapApi) {
      alert("Delete API not configured");
      return;
    }
    if (!window.confirm("Delete this mapping?")) return;
    const url = `${delMapApi.replace(/\/$/, "")}/${id}/`;
    deleteRequest(url, {}, props, true)
      .then((response) => {
        if (response && (response.status === 200 || response.status === 204)) {
          alert("Mapping deleted");
          loadMappings();
        } else {
          alert("Failed to delete mapping");
        }
      })
      .catch((err) => {
        alert(err?.response?.data?.message || err?.message || "Failed to delete mapping");
      });
  };

  const viewUrl = Actions.custom_design_template?.view?.url || "/custom-design-template";

  if (loading && mappings.length === 0) {
    return <LoadingGif />;
  }

  return (
    <Paper className="paper-background" elevation={1}>
      <Grid container>
        <Grid item md={6} xs={12} className="header-align">
          <Box className="heading" sx={{ fontWeight: 600, fontSize: "1.25rem" }}>
            Template Design Map
          </Box>
        </Grid>
        <Grid item md={6} xs={12}>
          <Box className="header-align end-flex-prop">
            <Button
              variant="contained"
              component={Link}
              to={viewUrl}
              className="editbutton-view"
              startIcon={<VisibilityOutlinedIcon className="visibility-icon" />}
              sx={{ minHeight: 40 }}
            >
              Back to Custom Design Template
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ px: 2, py: 3, maxWidth: 900 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              select
              SelectProps={{ native: true }}
              label="Template design"
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                if (errors.template) setErrors((prev) => ({ ...prev, template: null }));
              }}
              error={Boolean(errors.template)}
              helperText={errors.template}
              variant="outlined"
              size="small"
            >
              <option value=""></option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.template_name || `Template ${t.id}`}
                </option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Key"
              value={keyValue}
              onChange={(e) => {
                setKeyValue(e.target.value);
                if (errors.key) setErrors((prev) => ({ ...prev, key: null }));
              }}
              error={Boolean(errors.key)}
              helperText={errors.key}
              placeholder="e.g. fees_receipt"
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={submitting}
              sx={{ minHeight: 40 }}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ fontWeight: 600, mb: 2 }}>Existing mappings</Box>
          <TableContainer component={Paper} elevation={0} style={{ border: "1px solid #dee2e6" }}>
            <Table size="small">
              <TableHead>
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>Key</TableCell>
                  <TableCell>Template design (ID)</TableCell>
                  <TableCell>Template name</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} style={{ color: "#6c757d" }}>
                      No mappings yet. Add one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((row) => (
                    <TableRow key={row.id || `${row.key}-${row.custom_design_template_id}`}>
                      <TableCell>{row.key}</TableCell>
                      <TableCell>{row.template ?? row.custom_design_template ?? row.template_id}</TableCell>
                      <TableCell>
                        {row.custom_design_template_name ??
                          row.template_name ??
                          (templates.find((t) => t.id === (row.custom_design_template_id ?? row.template_id))?.name || "—")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="secondary"
                          variant="outlined"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Paper>
  );
};

export default withRouter(TemplateDesignMap);
