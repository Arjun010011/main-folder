import React, { useState, useEffect } from "react";
import { Box, Grid, Button, MenuItem, Select, InputLabel, FormControl } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import StudyCertificateNew from "Containers/Certificates/StudyCertificateNew";
import CharacterCertificate from "Containers/Certificates/CharacterCertificate";
import TcCertificateNew from "Containers/Certificates/TcCertificateNew";

function StudentCertifications({ studentId }) {
  const [certificateType, setCertificateType] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);

  const handleViewCertificate = () => {
    setShowCertificate(true);
  };

  const renderCertificateComponent = () => {
    switch (certificateType) {
      case "studycertificate":
        return (
          <StudyCertificateNew
            student={studentId}
            certificate_type="studycertificate"
            hideViewButton={true}
          />
        );
      case "charactercertificate":
        return (
          <CharacterCertificate
            student={studentId}
            certificate_type="charactercertificate"
            hideViewButton={true}

          />
        );
      case "tccertificate":
        return (
          <TcCertificateNew
            student={studentId}
            certificate_type="tccertificate"
            hideViewButton={true}

          />
        );
      default:
        return null;
    }
  };

  return (
    <Box style={{ paddingTop: "20px", textAlign: "left" }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth variant="outlined" size="small" style={{ width: "240px" }}>
            <InputLabel>Select Certificate Type</InputLabel>
            <Select
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value)}
              label="Select Certificate Type"
            >
              <MenuItem value="studycertificate">Study Certificate</MenuItem>
              <MenuItem value="charactercertificate">Character Certificate</MenuItem>
              <MenuItem value="tccertificate">TC Certificate</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button
            variant="contained"
            color="primary"
            disabled={!certificateType}
            onClick={handleViewCertificate}
            style={{ marginLeft: "-150px" }}
          >
            View Certificate
          </Button>
        </Grid>

        {showCertificate && (
          <Grid item xs={12}>
            {renderCertificateComponent()}
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default withRouter(StudentCertifications);
