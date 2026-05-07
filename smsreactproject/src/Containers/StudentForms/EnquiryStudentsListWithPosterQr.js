import { withRouter } from "react-router-dom";
import EnquiryStudentsListWithRouter from "./EnquiryStudentsList";
import { downloadPublicFormQrPoster } from "./publicFormQrDownload";

const EnquiryStudentsListBase = EnquiryStudentsListWithRouter.WrappedComponent;

class EnquiryStudentsList extends EnquiryStudentsListBase {
  generateQRCode = (id) => {
    const { year, yearList } = this.state;
    downloadPublicFormQrPoster("enquiry", year, yearList, id);
  };
}

export default withRouter(EnquiryStudentsList);
