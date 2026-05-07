import React from "react";
import {
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
} from "@material-ui/core";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import idcard1 from "images/idcard1.png";
import idcard3 from "images/idcard3.png";

const temp_image_list = [
  { id: 1, image_url: idcard1, name: "Id Card1" },
  { id: 3, image_url: idcard3, name: "Id Card3" },
];

export default function TemplatePreview(props) {
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [templateList, setTemplateList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIdCard, setSelectedIdCard] = React.useState(false);
  const [submitDisable, setSubmitDisable] = React.useState(false);

  const handleTemplateOpen = () => {
    if (!templateOpen) {
      setLoading(true);
      getTemplateList();
    }
    setTemplateOpen(!templateOpen);
  };

  const getTemplateList = () => {
    const url = GET_URL.academicyear.api;
    const params = {};
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setTemplateList([...temp_image_list]);
      }
    });
  };

  React.useEffect(() => {
    setLoading(false);
  }, [templateList]);

  const handleSelectCard = (data) => {
    setSelectedIdCard(data.id);
  };

  const submitTemplate = () => {};

  return (
    <div>
      <Paper>
        <div className="fs-20 text-align-center pl-20 pr-20 pt-10 pb-10">
          Template Preview
        </div>
        <div className="text-align-center pt-10 pb-10">
          <Button className="custom-button" onClick={handleTemplateOpen}>
            Select Template
          </Button>
        </div>
      </Paper>
      <Dialog
        open={templateOpen}
        className={"action-new-custom-form-width"}
        onClose={handleTemplateOpen}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title"></DialogTitle>
        {loading ? (
          <DialogContent>
            <CircularProgress />
          </DialogContent>
        ) : (
          <DialogContent>
            <DialogContentText>{`Select Template`}</DialogContentText>
            <div className="d-flex">
              {templateList.map((data) => {
                return (
                  <div
                    className="pl-20"
                    style={{ position: "relative", cursor: "pointer" }}
                    onClick={() => handleSelectCard(data)}
                  >
                    <div
                      style={
                        selectedIdCard === data.id
                          ? {
                              ...{
                                border: "2px solid black",
                                borderRadius: "50%",
                                width: "20px",
                                height: "20px",
                                position: "absolute",
                                top: "5px",
                                left: "26px",
                                background: "black",
                              },
                            }
                          : {
                              ...{
                                border: "2px solid black",
                                borderRadius: "50%",
                                width: "20px",
                                height: "20px",
                                position: "absolute",
                                top: "5px",
                                left: "26px",
                              },
                            }
                      }
                    ></div>
                    <div style={{ border: "3px solid black" }}>
                      <img src={data.image_url} />
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleTemplateOpen}
          >
            Close
          </Button>
          {/* <div className="submt-button-float-bottom"> */}
          <Button
            variant="contained"
            color="primary"
            className="submit"
            disabled={submitDisable}
            onClick={submitTemplate}
          >
            Select
          </Button>
          {/* </div> */}
          {/* <Button disabled={updateDisable} className="submit">
            Update
          </Button> */}
        </DialogActions>
      </Dialog>
    </div>
  );
}
