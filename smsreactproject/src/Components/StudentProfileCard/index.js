import React, { useEffect } from "react";
import "./styles.scss";
import Avatar from "@material-ui/core/Avatar";
import { Box } from '@material-ui/core'
import {
  dateFormat,
  getFullName,
  isUserHasPermission,
} from "Includes/functions";
import { Skeleton } from "@material-ui/lab";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom/cjs/react-router-dom.min";

function StudentProfileCard(props) {
  const { id, details, isApiCall, student_name, standard_name, section_name } = props;

  const [loading, setLoading] = React.useState(false);
  const [student_list, set_student_list] = React.useState({});

  const handleMouseOver = () => {
    if (isApiCall) {
      if (!student_list.hasOwnProperty(id)) {
        setLoading(true);
        getRequest(GET_URL.getallstudents.api + id + "/", {}, {}).then(
          async (response) => {
            if (response && response.status === 200) {
              let students = response.data.data;
              students["number"] = students?.["admission_num"];
              set_student_list({ [id]: students });
            }
          }
        );
      }
    } else {
      set_student_list({ [id]: details });
    }
  };

  useEffect(() => {
    setLoading(false);
  }, [student_list]);

  const handleStudentView = () => {
    let studentDetail = {
      studentId: id,
    };
    let searchParam = "?" + new URLSearchParams(studentDetail).toString();
    props.history.push({
      pathname: Actions.general_student.view.url,
      search: searchParam,
      state: { detail: id },
    });
  };

  const student_details = student_list?.[id] ?? {};
  return (
    <div className="custom-tooltip" onMouseOver={handleMouseOver}>
      {student_name}
      <div className="custom-tooltip-right">
        {loading ? (
          <div>
            <Skeleton animation="wave" variant="rect" className="profile-skeleton-card" />
            <Skeleton animation="wave" variant="rect" className="student-details-skeleton-card" />
          </div>
        ) : (
          <div className="student-tooltip-container-bright">
            <Avatar className="custom-tooltip-profile-pic-bright">
              {student_details?.first_name?.charAt(0)}
              {student_details?.last_name?.charAt(0)}
            </Avatar>
            <div className="user-info-bright">
              <h2 className="user-name-bright">
                {getFullName(
                  student_details?.first_name,
                  student_details?.middle_name,
                  student_details?.last_name
                )}
              </h2>
              <Box className='text-align-center'>
                {student_details?.current_standard_name} - {section_name}
              </Box>
              <p className="user-status-bright">
                {student_details?.admission_history ? "🎓 Re Admission" : "🆕 New Student"}
              </p>
              <div className="info-row-bright">
                <span className="label-bright">👨 Father</span>
                <span className="value-bright">
                  {student_details?.student_parent?.parent?.father_name}
                </span>
              </div>
              <div className="info-row-bright">
                <span className="label-bright">🎂 DOB</span>
                <span className="value-bright">
                  {student_details?.dob ? dateFormat(student_details.dob, "DD-MM-YYYY") : ""}
                </span>
              </div>
              <div className="info-row-bright">
                <span className="label-bright">📱 Mobile</span>
                <span className="value-bright">{student_details?.mobile_num}</span>
              </div>
              <div className="info-row-bright">
                <span className="label-bright">🆔 Number</span>
                <span className="value-bright">{student_details?.number}</span>
              </div>
            </div>
            {isUserHasPermission("general_student_list", "view") && (
              <div className="more-details-link-bright" onClick={handleStudentView}>
                👉 More Details
              </div>
            )}
          </div>
        )}
      </div>
    </div>

  );
}

export default withRouter(StudentProfileCard);
