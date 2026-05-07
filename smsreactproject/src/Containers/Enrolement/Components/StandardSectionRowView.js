import React, { useState } from "react";
import {
  Box,
  Grid,
  Icon,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@material-ui/core";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import Swal from "sweetalert2";

import AssignSectionSubjects from "Containers/Enrolement/AssignSectionSubject/AssignSectionSubjects";
import {
  isUserHasPermission,
  getSettingValue,
  getFormatMessage,
} from "Includes/functions";
import { postRequest } from "Includes/api/apicall";
import commonMessages from "Constants/messages";
import { POST_URL } from "Includes/urls";
import messages from "./../messages";
import "../styles.scss";

const number_of_language = parseInt(getSettingValue("number_of_language"));

function CollapsableFeePlan(props) {
  const { year, yearName, enrollmentDetails } = props;
  const [expanded, setExpanded] = useState(
    props.expanded ? props.expanded : false
  );
  const [openLangDetailsPopup, setopenLangDetailsPopup] = useState(false);
  const [popupDetails, setPopupDetails] = useState({});

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const deleteSectionSubjects = (standard_section) => {
    const params = { standard_section, assigned_subjects: [] };
    const url = POST_URL.assignsubject.api;
    Swal.fire({
      title: "Are you sure?",
      html: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.value) {
        postRequest(url, params, props).then((response) => {
          if (response && response.status === 200) {
            props.getEnrollmentDetails();
          }
        });
      }
    });
  };

  const setPopupDetailsHandler = (standard, data) => {
    const popData = {
      yearName: yearName,
      standard: standard.name,
      section: data.name,
      year: year,
      student_id: standard.id,
      section_id: data.id,
      standard_section: data.standard_section,
      expanded: expanded,
    };
    setPopupDetails(popData);
    setopenLangDetailsPopup(() => true);
  };

  const onCancel = (status) => {
    if (status) {
      props.getEnrollmentDetails();
    }
    setPopupDetails({});
    setopenLangDetailsPopup(() => false);
  };

  return (
    <div>
      {enrollmentDetails &&
        enrollmentDetails.map((standard, index) => {
          return (
            <Accordion
              key={index + " panel"}
              expanded={expanded === `panel${index}`}
              className="mb-2"
              onChange={handleChange(`panel${index}`)}
            >
              <AccordionSummary
                // expandIcon={<ExpandMoreIcon />}
                className="pannel-summary "
              >
                <Box
                  className="md-down-justify-center even-flex-prop"
                  width="100%"
                >
                  <Icon
                    className={
                      expanded === `panel${index}`
                        ? "fa fa-play-circle play-Icon play-fee-icon fa-rotate-90"
                        : "fa fa-play-circle play-Icon play-fee-icon"
                    }
                  />
                  <Box className={"enroll-card-header text-capitalize"}>
                    {standard.name}
                  </Box>
                  <Box className="enrollment-row-total-section">
                    <Box component="span">
                      <FormattedMessage {...commonMessages.sections} /> :{" "}
                      {standard.sections.length}
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails className="pannel-details">
                <Box className="panel-details-row">
                  {standard.sections.map((data, i) => {
                    const section_name = data.name;
                    return (
                      <Box key={data.id + i} className="card-box">
                        <Box className="enrollment-section-sub-card" pb={3}>
                          <Box borderRadius={3}>
                            <Box className="custom-card-header">
                              <Box className="header">{section_name}</Box>
                              <Box className="sub-header">
                                <FormattedMessage
                                  {...commonMessages.subjects}
                                />
                                : {data.subjects.length}
                              </Box>
                            </Box>
                            {data.subjects.length !== 0 && (
                              <Box pt={1} pb={3} className={"card-data-body"}>
                                {data.subjects.map((subject, index) => {
                                  return (
                                    <Box key={index}>
                                      <Grid
                                        container
                                        className={
                                          data.subjects.length === index + 1
                                            ? "custom-card-body-data-no-bottom-line action"
                                            : "custom-card-body-data action"
                                        }
                                      >
                                        {subject.subject_is_language === true &&
                                          subject.subject_sequence === 1 &&
                                          number_of_language != 1 &&
                                          number_of_language != 0 && (
                                            <Grid
                                              item
                                              md={12}
                                              className="enrollment-section-subjects"
                                            >
                                              {`${
                                                subject.name
                                              } [${getFormatMessage(
                                                <FormattedMessage
                                                  {...messages.lang1}
                                                />
                                              )}]`}
                                            </Grid>
                                          )}
                                        {subject.subject_is_language === true &&
                                          (number_of_language == 1 ||
                                            number_of_language == 0) && (
                                            <Grid
                                              item
                                              md={12}
                                              className="enrollment-section-subjects"
                                            >
                                              {subject.name}
                                            </Grid>
                                          )}
                                        {subject.subject_is_language === true &&
                                          subject.subject_sequence === 2 &&
                                          number_of_language != 1 &&
                                          number_of_language != 0 && (
                                            <Grid
                                              item
                                              md={12}
                                              className="enrollment-section-subjects"
                                            >
                                              {`${
                                                subject.name
                                              } [${getFormatMessage(
                                                <FormattedMessage
                                                  {...messages.lang2}
                                                />
                                              )}]`}
                                            </Grid>
                                          )}
                                        {subject.subject_is_language === true &&
                                          subject.subject_sequence === 3 &&
                                          number_of_language != 1 &&
                                          number_of_language != 0 && (
                                            <Grid
                                              item
                                              md={12}
                                              className="enrollment-section-subjects"
                                            >
                                              {`${
                                                subject.name
                                              } [${getFormatMessage(
                                                <FormattedMessage
                                                  {...messages.lang3}
                                                />
                                              )}]`}
                                            </Grid>
                                          )}
                                        {subject.subject_is_language ===
                                          false && (
                                          <Grid
                                            item
                                            md={12}
                                            className="enrollment-section-subjects"
                                          >
                                            {subject.name}
                                          </Grid>
                                        )}
                                      </Grid>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                            {data.subjects.length === 0 && (
                              <Box
                                pt={1}
                                pb={3}
                                className="card-data-body flex-justify-center-flex-prop"
                              >
                                <Box>
                                  <FormattedMessage
                                    {...commonMessages.noData}
                                  />
                                </Box>
                              </Box>
                            )}
                            {isUserHasPermission(
                              "assign_subjects",
                              "create"
                            ) && (
                              <Box className="action-box">
                                <Icon
                                  className="fa fa-pencil-square-o edit-icon"
                                  onClick={() =>
                                    setPopupDetailsHandler(standard, data)
                                  }
                                />
                                {data.subjects.length > 0 && (
                                  <Icon
                                    className="fa fa-trash delete-all-icon pointer"
                                    onClick={() =>
                                      deleteSectionSubjects(
                                        data.standard_section
                                      )
                                    }
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      {openLangDetailsPopup && (
        <AssignSectionSubjects {...popupDetails} onCancel={onCancel} />
      )}
    </div>
  );
}

CollapsableFeePlan.propTypes = {
  year: PropTypes.number.isRequired,
  yearName: PropTypes.string.isRequired,
  enrollmentDetails: PropTypes.array.isRequired,
  getEnrollmentDetails: PropTypes.func.isRequired,
  expanded: PropTypes.bool,
};

export default CollapsableFeePlan;
