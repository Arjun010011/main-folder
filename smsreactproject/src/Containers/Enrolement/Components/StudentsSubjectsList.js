import React, { useState } from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Button,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import "../styles.scss";

function CollapsableFeePlan(props) {
  const standardList = [...props.standardList];
  const year = props.academicYear;
  const [expanded, setExpanded] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [sudent_id, setStudentID] = useState([]);
  const [standard_section, setStandardSectionID] = useState([]);

  const handleChange =
    (panel, student, standard_section) => (event, isExpanded) => {
      let url = GET_URL.assignsubjectstudent.api;
      let params = { academic_year: year, student: student, is_list: 1 };
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          setSubjects(response.data.data);
        }
      });
      setExpanded(isExpanded ? panel : false);
      setStudentID(student);
      setStandardSectionID(standard_section);
    };

  const assignSubject = () => {
    let { subjectassignurl } = props;
    props.history.push({
      pathname: subjectassignurl,
      state: {
        detail: {
          year: year,
          student_id: sudent_id,
          expanded: expanded,
          standardList: standardList,
          standard_section: standard_section,
        },
      },
    });
  };

  return (
    <div>
      <Box className="studentList mb-10">
        {standardList && standardList.length === 0
          ? "No Students Enrolled"
          : ""}
      </Box>
      {standardList &&
        standardList.map((student, index) => {
          return (
            <Accordion
              key={student.student}
              expanded={expanded === `panel${index}`}
              className="mb-2"
              onChange={handleChange(
                `panel${index}`,
                student.student,
                student.standard_section
              )}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1bh-content"
                id="panel1bh-header"
                className="pannel-summary "
              >
                <Box>
                  <Box
                    className="md-down-justify-center even-flex-prop"
                    width="100%"
                  >
                    <Avatar
                      alt={student.name}
                      src={
                        student.profile_pic_details
                          ? student.profile_pic_details.file
                          : student.name
                      }
                    />
                    <Box className="marign-left-20 margin-top-10">
                      {student.name}
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails className="pannel-details">
                <Paper>
                  <Box>
                    <List dense className="subjectList">
                      <Box
                        display="flex"
                        className="studentList mb-10 heading-margin-top-20"
                      >
                        {subjects.length === 0
                          ? "No Students Enrolled"
                          : "Assigned Subjects"}
                      </Box>
                      {subjects.length !== 0 && (
                        <Box>
                          <Divider className="dividerwidth  mb-10 marign-left-20" />
                        </Box>
                      )}
                      {subjects.map((sectionStudents) => {
                        const labelId = `checkbox-list-secondary-label-${sectionStudents.subject}`;
                        return (
                          <ListItem key={sectionStudents.subject} button>
                            <ListItemText
                              className="marign-left-20"
                              id={labelId}
                              primary={sectionStudents.subject_name}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    className="add-subject"
                  >
                    <Button variant="outlined" onClick={() => assignSubject()}>
                      Add Subject
                    </Button>
                  </Box>
                </Paper>
              </AccordionDetails>
            </Accordion>
          );
        })}
    </div>
  );
}

CollapsableFeePlan.propTypes = {
  standardList: PropTypes.array.isRequired,
  academicYear: PropTypes.number.isRequired,
  subjectassignurl: PropTypes.string.isRequired,
  history: PropTypes.array.isRequired,
};

export default withRouter(CollapsableFeePlan);
