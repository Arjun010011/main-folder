/**
 * Shared QR poster download for public enquiry / public application URLs.
 */
import Swal from "sweetalert2";
import {
  buildQrPosterDataUrl,
  getInstituteNameFromStorage,
  triggerQrPosterDownload,
} from "Includes/buildQrPosterImage";

function resolveYearBundle(year, yearList) {
  let start_date;
  let end_date;
  let year_name;
  (yearList || []).forEach((data) => {
    if (String(data.id) === String(year)) {
      start_date = data.start_date;
      end_date = data.end_date;
      year_name = data.name;
    }
  });
  return { year_name, start_date, end_date };
}

/**
 * @param {'enquiry'|'application'} kind
 * @param {string|number} year
 * @param {Array} yearList
 * @param {string} id segment for filename (e.g. 'all')
 */
export function downloadPublicFormQrPoster(kind, year, yearList, id = "all") {
  if (year === undefined || year === null || year === "") {
    Swal.fire({
      icon: "warning",
      title: "Academic year required",
      text: "Please select an academic year before generating the QR code.",
    });
    return;
  }
  const { year_name, start_date, end_date } = resolveYearBundle(year, yearList);
  const enquiryInfo = { year, year_name, start_date, end_date };
  const baseUrl = window.location.origin;
  const schoolName = getInstituteNameFromStorage();

  let targetUrl;
  let filename;
  let headline;
  let sublineExtra;
  let footer;

  if (kind === "enquiry") {
    targetUrl = `${baseUrl}/public-enquiry/?${new URLSearchParams(enquiryInfo).toString()}`;
    filename = `public-enquiry-qr-${id}.png`;
    headline = "Scan this QR code to submit an enquiry";
    sublineExtra = "";
    footer = "Open your phone camera and scan the code above.\nYou will be taken to the online enquiry form.";
  } else {
    targetUrl = `${baseUrl}/apply/application/?${new URLSearchParams(enquiryInfo).toString()}`;
    filename = `public-application-qr-${id}.png`;
    headline = "Scan this QR code to fill out the application";
    sublineExtra = "";
    footer = "Open your phone camera and scan the code above.\nYou will be taken to the online application form.";
  }

  const subline = sublineExtra;

  buildQrPosterDataUrl(
    targetUrl,
    {
      schoolName,
      headline,
      subline,
      footer,
      qrWidth: 280,
      theme: kind === "application" ? "application" : "enquiry",
    },
    (err, dataUrl) => {
      if (err || !dataUrl) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to generate QR code",
        });
        return;
      }
      triggerQrPosterDownload(dataUrl, filename);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "QR poster downloaded successfully",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  );
}
