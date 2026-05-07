import React from "react";
import { MenuItem, MenuList } from "@material-ui/core";
import { file_default_image_view_details } from "Containers/VideoTutorials/Constants";
import "../styles.scss";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";

export function DownloadList(props) {
  return (
    <div>
      <div
        style={{
          textDecoration: "underline",
          fontSize: "20px",
          color: "blue",
          padding: "10px",
        }}
      >
        Report Downloads
      </div>
      <div className="p-10">
        <div className="d-flex flex-justify-space-between">
          <div className="d-flex">
            <div className={file_default_image_view_details.pdf.className}>
              {file_default_image_view_details.pdf["tag"]}
            </div>
            <div className="download-file-name">Finance Report 04-08-2024</div>
          </div>
          <div>
            <GetAppRoundedIcon />
          </div>
        </div>
        <div className="d-flex flex-justify-space-between">
          <div className="d-flex">
            <div className={file_default_image_view_details.csv.className}>
              {file_default_image_view_details.csv["tag"]}
            </div>
            <div className="download-file-name">Student Report 04-08-2024</div>
          </div>
          <div>
            <GetAppRoundedIcon />
          </div>
        </div>
        <div className="d-flex flex-justify-space-between">
          <div className="d-flex">
            <div className={file_default_image_view_details.xls.className}>
              {file_default_image_view_details.xls["tag"]}
            </div>
            <div className="download-file-name">Staff Report 04-08-2024</div>
          </div>
          <div>
            <GetAppRoundedIcon />
          </div>
        </div>
        <div className="d-flex flex-justify-space-between">
          <div className="d-flex">
            <div className={file_default_image_view_details.pdf.className}>
              {file_default_image_view_details.pdf["tag"]}
            </div>
            <div className="download-file-name">Finance Report 04-08-2024</div>
          </div>
          <div>
            <GetAppRoundedIcon />
          </div>
        </div>
        <div className="d-flex flex-justify-space-between">
          <div className="d-flex">
            <div className={file_default_image_view_details.csv.className}>
              {file_default_image_view_details.csv["tag"]}
            </div>
            <div className="download-file-name">Student Report 04-08-2024</div>
          </div>
          <div>
            <GetAppRoundedIcon />
          </div>
        </div>
        <div className="d-flex flex-justify-space-between">
          <div className="d-flex">
            <div className={file_default_image_view_details.xls.className}>
              {file_default_image_view_details.xls["tag"]}
            </div>
            <div className="download-file-name">Staff Report 04-08-2024</div>
          </div>
          <div>
            <GetAppRoundedIcon />
          </div>
        </div>
      </div>
    </div>
  );
}
