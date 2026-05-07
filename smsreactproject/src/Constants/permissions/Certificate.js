import React from "react";
import { GET_URL } from "Includes/urls";

import StudyCertificateList from "Containers/Certificates/StudyCertificateList";
import StudyCertificateNew from "Containers/Certificates/StudyCertificateNew";
import AdmissionAbstractList from "Containers/Certificates/AdmissionAbstractList";
import AdmissionAbstract from "Containers/Certificates/AdmissionAbstract";
import TcCertificateList from "Containers/Certificates/TcCertificateList";
import TcCertificateNew from "Containers/Certificates/TcCertificateNew";
import CharacterCertificate from "Containers/Certificates/CharacterCertificate";
import CharacterCertificateList from "Containers/Certificates/CharacterCertificateList";
import CertificateList from "Containers/Certificates/CertificateList";
import CertificateNew from "Containers/Certificates/CertificateNew";
import StaffCertificateList from "Containers/Certificates/StaffCertificateList";
import StaffCertificateNew from "Containers/Certificates/StaffCertificateNew";
const Actions = {
  study_certificate_list: {
    view: {
      codenames: [
        GET_URL.getenrolledstudents.basename,
        GET_URL.certificate.basename,
      ],
      action_code: "visible_study_certificate_list_view",
      is_superuser_action: false,
      name: "Study Certificate",
      label: "Study Certificate",
      action: "sub-menu",
      url: "/certificate/studycertificate/list",
      old_url: "/certificate/studycertificate/list",
      component: <CertificateList />,
      permission_needed: true,
      associated_urls: ["/certificate/studycertificate/detail"],
    },
    name: "Study Certificate",
    type: "certificate",
    old_code: "study_certificate_list",
  },
  study_certificate: {
    view: {
      codenames: [GET_URL.certificate.basename],
      action_code: "visible_study_certificate_view",
      is_superuser_action: false,
      name: "Study Certificate",
      label: "Study Certificate",
      action: "action-url",
      url: "/certificate/studycertificate/detail",
      old_url: "/certificate/studycertificate/detail",
      component: <CertificateNew />,
      permission_needed: false,
    },
    name: "Study Certificate View",
    type: "certificate",
    old_code: "study_certificate",
  },

  admission_abstract_list: {
    view: {
      codenames: [GET_URL.getenrolledstudents.basename],
      action_code: "visible_admission_abstract_list_view",
      is_superuser_action: false,
      name: "Admission Abstract",
      label: "Admission Abstract",
      action: "sub-menu",
      url: "/certificate/admissionabstract/list",
      old_url: "/certificate/admissionabstract/list",
      component: <AdmissionAbstractList />,
      permission_needed: true,
      associated_urls: ["/certificate/admissionabstract/detail"],
    },
    name: "Admission Abstract",
    type: "certificate",
    old_code: "admission_abstract_list",
  },

  admission_abstract: {
    view: {
      codenames: [GET_URL.certificate.basename],
      action_code: "visible_admission_abstract_view",
      is_superuser_action: false,
      name: "Admission Abstract",
      label: "Admission Abstract",
      action: "action-url",
      url: "/certificate/admissionabstract/detail",
      old_url: "/certificate/admissionabstract/detail",
      component: <AdmissionAbstract />,
      permission_needed: false,
    },
    name: "Admission Abstract View",
    type: "certificate",
    old_code: "admission_abstract",
  },
  tc_certificate_issue_list: {
    view: {
      codenames: [
        GET_URL.getenrolledstudents.basename,
        GET_URL.certificate.basename,
      ],
      action_code: "visible_tc_certificate_issue_list_view",
      is_superuser_action: false,
      name: "TC Certificate List",
      label: "TC Certificate List",
      action: "sub-menu",
      url: "/certificate/tc/list",
      component: <TcCertificateList />,
      permission_needed: true,
    },
    name: "TC Certificate List",
    type: "certificate",
  },
  tc_certificate_issue: {
    view: {
      codenames: [
        GET_URL.getenrolledstudents.basename,
        GET_URL.certificate.basename,
      ],
      action_code: "visible_tc_certificate_issue_view",
      is_superuser_action: false,
      name: "TC Certificate",
      label: "TC Certificate",
      action: "action-url",
      url: "/certificate/tc/detail",
      component: <TcCertificateNew />,
      permission_needed: false,
    },
    name: "TC Certificate View",
    type: "certificate",
  },
  character_certificate_list: {
    view: {
      codenames: [
        GET_URL.getenrolledstudents.basename,
        GET_URL.certificate.basename,
      ],
      action_code: "visible_character_certificate_list_view",
      is_superuser_action: false,
      name: "Character Certificate",
      label: "Character Certificate",
      action: "sub-menu",
      url: "/certificate/character/list",
      component: <CharacterCertificateList />,
      permission_needed: true,
      associated_urls: ["/certificate/character/detail"],
    },
    name: "Character Certificate",
    type: "certificate",
  },
  character_certificate: {
    view: {
      codenames: [GET_URL.certificate.basename],
      action_code: "visible_character_certificate_view",
      is_superuser_action: false,
      name: "Character Certificate",
      label: "Character Certificate",
      action: "action-url",
      url: "/certificate/character/detail",
      component: <CharacterCertificate />,
      permission_needed: false,
    },
    name: "Character Certificate View",
    type: "certificate",
  },
  multiple_certificate_list: {
    view: {
      codenames: [
        GET_URL.getenrolledstudents.basename,
        GET_URL.certificate.basename,GET_URL.getacademicyear,GET_URL.getstandardandsection,GET_URL.multipleothercertificate,
      ],
      action_code: "visible_multiple_certificate_list_view",
      is_superuser_action: false,
      name: "Multiple Certificate",
      label: "Multiple Certificate",
      action: "sub-menu",
      url: "/certificate/multiplecertificate/list",
      old_url: "/certificate/multiplecertificate/list",
      component: <CertificateList />,
      permission_needed: true,
      associated_urls: ["/certificate/studycertificate/detail"],
    },
    name: "Multiple Student Certificate",
    type: "certificate",
    old_code: "multiple_study_certificate_list",
  },
  multiple_certificate: {
    view: {
      codenames: [GET_URL.certificate.basename],
      action_code: "visible_multiple_certificate_view",
      is_superuser_action: false,
      name: "Multiple Study Certificate",
      label: "Multiple Study Certificate",
      action: "action-url",
      url: "/certificate/multiplecertificate/detail",
      old_url: "/certificate/multiplecertificate/detail",
      component: <CertificateNew />,
      permission_needed: false,
    },
    name: "Multiple Student Certificate",
    type: "certificate",
    old_code: "multiple_certificate",
  },
  multiple_staff_certificate_list: {
    view: {
      codenames: [
        GET_URL.getenrolledstudents.basename,
        GET_URL.certificate.basename,GET_URL.getacademicyear,GET_URL.getstandardandsection,GET_URL.multipleothercertificate,
      ],
      action_code: "visible_multiple_staff_certificate_list_view",
      is_superuser_action: false,
      name: "Multiple Staff Certificate",
      label: "Multiple Staff Certificate",
      action: "sub-menu",
      url: "/certificate/staffcertificate/list",
      old_url: "/certificate/staffcertificate/list",
      component: <StaffCertificateList/>,
      permission_needed: true,
      associated_urls: ["/certificate/staffcertificate/detail"],
    },
    name: "Multiple Staff Certificate",
    type: "certificate",
    old_code: "multiple_staff_certificate_list",
  },
  multiple_staff_certificate: {
    view: {
      codenames: [GET_URL.certificate.basename],
      action_code: "visible_multiple_staff_certificate_view",
      is_superuser_action: false,
      name: "Staff Certificate",
      label: "Staff Certificate",
      action: "action-url",
      url: "/certificate/staffcertificate/detail",
      old_url: "/certificate/staffcertificate/detail",
      component: <StaffCertificateNew/>,
      permission_needed: false,
    },
    name: "Staff Certificate View",
    type: "staff certificate",
    old_code: "multiple_staff_certificate",
  },
};

export default Actions;
