import React from "react";

import ViewGallery from "Containers/Gallery/ViewGallery";


const pathAlias = JSON.parse(localStorage.getItem("pathAlias"))
  ? JSON.parse(localStorage.getItem("pathAlias"))
  : {};

const Actions = {
  gallery: {
    view: {
      codenames: [
      ],
      action_code: "visible_gallery_view",
      is_superuser_action: false,
      name: "Gallery",
      label: "Gallery",
      action: "sub-menu",
      url: "/gallery/gallery/view",
      component: <ViewGallery />,
      permission_needed: true,
      exclude_roles: [7],
      old_url: "/gallery/gallery/view",
    },
    create: {
      codenames: [
      ],
      action_code: "visible_gallery_add",
      is_superuser_action: false,
      name: "Gallery",
      label: "Gallery",
      action: "action",
      // url: '/finance/features/view',
      // component: <EnableFeaturePopup />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Gallery",
    type: "gallery",
    old_code: "gallery",
  },
}
export default Actions;
