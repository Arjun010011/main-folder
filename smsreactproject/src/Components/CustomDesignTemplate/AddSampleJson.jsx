import React, { useState } from "react";
import { Link, withRouter } from "react-router-dom";
import {
  Paper,
  Grid,
  Box,
  Button,
  TextField,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import Swal from "sweetalert2";

const AddSampleJson = (props) => {
  const [templateName, setTemplateName] = useState("");
  const [templateDataRaw, setTemplateDataRaw] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!templateName || !String(templateName).trim()) {
      next.templateName = "Template name is required.";
    }
    if (!templateDataRaw || !String(templateDataRaw).trim()) {
      next.templateData = "Content is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const url = POST_URL.template_sample_json?.api;
    if (!url) {
      Swal.fire("Error", "Sample JSON API not configured", "error");
      return;
    }

    // Parse template_data: send as JSON object only, never as string
    let templateData = {};
    const raw = String(templateDataRaw).trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          templateData = parsed;
        }
      } catch (_) {
        setErrors((prev) => ({ ...prev, templateData: "Invalid JSON" }));
        return;
      }
    }

    const payload = {
      template_name: templateName.trim(),
      template_data: templateData,
    };

    setSubmitting(true);

    postRequest(url, payload, props)
      .then((response) => {
        const status = response?.status ?? response?.data?.status;
        if (response) {
          alert("Sample JSON saved successfully");
        } else {
          Swal.fire(
            "Error",
            response?.data?.message || response?.data?.detail || "Failed to save sample JSON",
            "error"
          );
        }
      })
      .catch((err) => {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          (typeof err?.response?.data === "string" ? err.response.data : null) ||
          err?.message ||
          "Failed to save sample JSON";
        Swal.fire("Error", message, "error");
      })
      .finally(() => setSubmitting(false));
  };
  
  
  

  const viewUrl = Actions.custom_design_template?.view?.url || "/custom-design-template";

  return (
    <Paper className="paper-background" elevation={1}>
      <Grid container>
        <Grid item md={6} xs={12} className="header-align">
          <Box className="heading" sx={{ fontWeight: 600, fontSize: "1.25rem" }}>
            Add Sample JSON
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Template name"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                if (errors.templateName) setErrors((prev) => ({ ...prev, templateName: null }));
              }}
              error={Boolean(errors.templateName)}
              helperText={errors.templateName}
              placeholder="e.g. Student Marks Sample"
              variant="outlined"
              size="small"
              inputProps={{ maxLength: 255 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Sample JSON (template_data)"
              value={templateDataRaw}
              onChange={(e) => {
                setTemplateDataRaw(e.target.value);
                if (errors.templateData) setErrors((prev) => ({ ...prev, templateData: null }));
              }}
              error={Boolean(errors.templateData)}
              helperText={errors.templateData || 'Stored as JSON in DB. Use e.g. {"data": [{ "id": 1, "name": "...", ... }]}'}
              placeholder={'{"data": [{"id": 1, "name": "Tamil", "codename": "tamil", ...}, ...]}'}
              variant="outlined"
              size="small"
              multiline
              minRows={12}
              maxRows={24}
              style={{ fontFamily: "monospace", fontSize: "13px" }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={submitting}
              sx={{ minHeight: 40 }}
            >
              {submitting ? "Saving…" : "Save Sample JSON"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default withRouter(AddSampleJson);
