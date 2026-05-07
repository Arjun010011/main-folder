import React, { useEffect, useState } from "react";
import { Paper, Box, Grid } from "@material-ui/core";
import { Actions } from "Constants/permissions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { getFormDefiniationNames } from "Containers/Admin/FormDefinition/functions";
import Swal from "sweetalert2";

const setting_config = JSON.parse(
  localStorage.getItem("setting_configuration")
)
  ? JSON.parse(localStorage.getItem("setting_configuration"))
  : {};

export default function Settings(props) {
  const themes = [
    { id: "blue", color: "#4680FF" },
    { id: "pink", color: "#a500fb" },
  ];
  const [selectedTheme, setSelectedTheme] = useState(
    setting_config["theme_name"]
  );
  const [formDefinitionList, setFormDefinitionList] = useState([]);

  const changeTheme = (color) => {
    setSelectedTheme(color);
    postFormDefinition(color);
  };

  useEffect(() => {
    const url = GET_URL.formdefinition.api;
    const params = { form_name: "setting_configuration", is_active: true };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setFormDefinitionList(response.data.data);
      }
    });
  }, []);

  const postFormDefinition = (color) => {
    formDefinitionList.map((data) => {
        if (data.column_name === "theme_name") {
        data.default_value = color;
      }
    });
    const url = POST_URL.formdefinition.api;
    postRequest(url, formDefinitionList, props).then((response) => {
      if (response && response.status === 200) {
        updateToFormDefinition();
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        window.location.reload();
      }
    });
  };

  const updateToFormDefinition = async () => {
    await getFormDefiniationNames("setting_configuration", true);
    window.location.reload();
  };

  return (
    <div>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={8} xs={12} className="header-align">
            <Box className="heading">{Actions.settings.view.label}</Box>
          </Grid>
        </Grid>
        <Paper className="paper-plain-background mt-20 p-20">
          <div className="d-flex">
            <div className="fs-20">Select Theme</div>
            <div className="d-flex ml-30">
              {themes.map((data, index) => (
                <div
                  key={index}
                  onClick={() => changeTheme(data.id)}
                  style={{
                    backgroundColor: data.color,
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    border:
                      selectedTheme === data.id ? "3px solid black" : "none",
                    marginLeft: "10px",
                  }}
                />
              ))}
            </div>
          </div>
        </Paper>
      </Paper>
    </div>
  );
}
