import React, { Component } from "react";
import { Paper, Grid, Avatar } from "@material-ui/core";
import Box from "@material-ui/core/Box";
import EditIcon from "@material-ui/icons/Edit";
import { Link, withRouter } from "react-router-dom";
import Button from "@material-ui/core/Button";

import EmailTwoToneIcon from "@material-ui/icons/EmailTwoTone";
import GetAppOutlinedIcon from "@material-ui/icons/GetAppOutlined";
import "./styles.scss";

class DetailsFillForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      heading_key: 1,
    };
  }

  onClick = (data) => {
    this.props.change(data);
    this.setState({
      heading_key: data,
    });
  };

  render() {
    let { short_info, profile_info, tabs, editURL, studentID, enabledAction } =
      this.props;
    return (
      <Box className="profile-card-position profile-card-sticky">
        <Paper className="studentcard">
          <Box className="CardPaper profile-background-image">
            {short_info[1].value && (
              <Box className="grid-profile-pic-position">
                <Avatar
                  alt="Profile Pic"
                  src={short_info[1].value}
                  className="individual-profile-pic"
                />
              </Box>
            )}
            {!short_info[1].value && (
              <Box className="grid-profile-pic-position">
                <Avatar className="individual-profile-pic">
                  {short_info[2].value.charAt(0)}
                  {short_info[4].value.charAt(0)}
                </Avatar>
              </Box>
            )}
            {enabledAction.includes("edit") && (
              <Link
                display="flex"
                justifyContent="flex-end"
                position="absolute"
                className="edit"
              >
                <Button
                  variant="contained"
                  p={1}
                  component={Link}
                  to={{
                    pathname: editURL,
                    state: {
                      detail: studentID,
                    },
                  }}
                  className="editDetails"
                >
                  <EditIcon
                    style={{
                      marginRight: "5px",
                      marginTop: "1px",
                      fontSize: "15px",
                    }}
                  />{" "}
                  Edit Form
                </Button>
              </Link>
            )}
          </Box>
          <Box justifyContent="center" className="profileName break-word">
            {`${short_info[2].value ? short_info[2].value : ""} ${
              short_info[3].value ? short_info[3].value : ""
            } ${short_info[4].value ? short_info[4].value : ""}`}
          </Box>
          <Box pb={3} className="standard">
            {short_info[5].value && short_info[5].value} 
            {short_info[6]?.value && ' - ' + short_info[6].value}
          </Box>
          {profile_info && (
            <Box>
              {profile_info.map((data, index) => {
                return (
                  <Box display="flex" key={index} justifyContent="flex-start">
                    <Grid container>
                      <Grid item md={4} xs={12}>
                        <Box className="Label">{data.label}</Box>
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <Box className="Value">{data.value}</Box>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          )}
          {tabs.map((data, index) => {
            return (
              <Box
                display="flex"
                onClick={(e) => this.onClick(data.key)}
                key={index}
                justifyContent="flex-start"
                pb={1}
                pl={2}
                className={
                  data.key === this.state.heading_key
                    ? "selectedheading"
                    : "profile-heading"
                }
              >
                <Box
                  className={
                    data.key === this.state.heading_key
                      ? "selectedLabel"
                      : "Label"
                  }
                >
                  {data.icon}
                </Box>
                <Box
                  className={
                    data.key === this.state.heading_key
                      ? "selectedValue"
                      : "Value"
                  }
                >
                  {data.value}
                </Box>
              </Box>
            );
          })}
        </Paper>
      </Box>
    );
  }
}

export default withRouter(DetailsFillForm);
