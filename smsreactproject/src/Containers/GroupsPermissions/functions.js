import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, POST_URL } from "Includes/urls";

export const getTreeStucturedMenus = (menus) => {
  let treeStructuredMenus = [];
  let idsConsidered = [];
  let dataFound = true;
  let next_menu = null;
  let first_child = null;
  let parentData = {};
  let parentCurrentIndex = 0;
  let parent_next_menu = null;
  let firstItemResolved = false;
  let next_menu_ids = [];
  for (const menu of menus) {
    next_menu_ids.push(menu.next_menu);
  }
  while (dataFound) {
    dataFound = false;
    for (const menu of menus) {
      if (menu.parent === 0 && !next_menu_ids.includes(menu.id)) {
        firstItemResolved = true;
      }
      if (!idsConsidered.includes(menu.id) && firstItemResolved) {
        if (first_child) {
          if (menu.id === first_child) {
            first_child = null;
            const data = {
              title: menu.alias_name,
              data: menu,
              id: menu.id,
              subtitle: menu.path,
              children: [],
            };
            treeStructuredMenus[parentCurrentIndex]["children"] = [data];
            next_menu = menu.next_menu ? menu.next_menu : null;
            dataFound = true;
            idsConsidered.push(menu.id);
          }
          continue;
        }
        if (next_menu) {
          if (next_menu === menu.id) {
            first_child = menu.first_child ? menu.first_child : null;
            next_menu = menu.next_menu ? menu.next_menu : null;
            let children = [
              ...treeStructuredMenus[parentCurrentIndex]["children"],
            ];
            const data = {
              title: menu.alias_name,
              data: menu,
              id: menu.id,
              subtitle: menu.path,
              children: [],
            };
            children.push(data);
            treeStructuredMenus[parentCurrentIndex]["children"] = children;
            dataFound = true;
            idsConsidered.push(menu.id);
          }
          continue;
        }
        if (treeStructuredMenus.length === 0 || parent_next_menu === menu.id) {
          idsConsidered.push(menu.id);
          parentCurrentIndex = treeStructuredMenus.length;
          parentData = {
            title: menu.alias_name,
            data: menu,
            id: menu.id,
            subtitle: menu.path,
            children: [],
          };
          treeStructuredMenus.push(parentData);
          first_child = menu.first_child ? menu.first_child : null;
          parent_next_menu = menu["next_menu"] ? menu["next_menu"] : null;

          dataFound = true;
          continue;
        }
      }
    }
  }
  return treeStructuredMenus;
};

export const getMenus = (treeStructuredMenus,menu_type) => {
  let data = [];
  for (const menus_index in treeStructuredMenus) {
    let menus = treeStructuredMenus[menus_index];
    let menu_data = menus.data;
    menu_data["next_menu"] = 0;
    menu_data["parent"] = 0;
    menu_data["first_child"] = 0;
    let previous_menu = null;
    let menu_children = [];
    if (parseInt(menus_index) !== 0) {
      treeStructuredMenus[menus_index - 1].data["next_menu"] = menu_data.id;
    }
    for (const subMenus_index in menus.children) {
      let subMenus = menus.children[subMenus_index].data;
      if (parseInt(subMenus_index) === 0) {
        menu_data["first_child"] = subMenus.id;
      }
      subMenus["parent"] = menu_data.id;
      subMenus["first_child"] = 0;
      subMenus["next_menu"] = 0;
      if (previous_menu) {
        menu_children[subMenus_index - 1]["next_menu"] = subMenus.id;
      } else {
        previous_menu = subMenus.id;
      }
      subMenus.menu_type = subMenus.menu_type ? subMenus.menu_type : "web";
      // menu_type = subMenus.menu_type
      menu_children.push(subMenus);
    }
    menu_data["menu_type"] = menu_type;
    if (data.length === 0) {
      data = [menu_data];
    } else {
      data = data.concat([menu_data]);
    }
    data = data.concat(menu_children);
  }
  return data;
};

export const getTreeStucturedPermissionHavingMenus = (menus, permissions) => {
  let treeStructuredMenus = [];
  let idsConsidered = [];
  let dataFound = true;
  let next_menu = null;
  let first_child = null;
  let parentData = {};
  let parentCurrentIndex = 0;
  let parent_next_menu = null;
  let firstItemResolved = false;
  let next_menu_ids = [];
  for (const menu of menus) {
    next_menu_ids.push(menu.next_menu);
  }
  while (dataFound) {
    dataFound = false;
    for (const menu of menus) {
      if (menu.parent === 0 && !next_menu_ids.includes(menu.id)) {
        firstItemResolved = true;
      }
      if (!idsConsidered.includes(menu.id) && firstItemResolved) {
        if (first_child) {
          if (menu.id === first_child) {
            first_child = null;
            if (Object.keys(permissions).includes(menu.path)) {
              const sub_menu_data = { ...menu, ...permissions[menu.path] };
              const data = {
                title: menu.alias_name,
                data: sub_menu_data,
                id: menu.id,
                subtitle: menu.path,
              };
              treeStructuredMenus[parentCurrentIndex]["children"] = [data];
            }
            next_menu = menu.next_menu ? menu.next_menu : null;
            dataFound = true;
            idsConsidered.push(menu.id);
          }
          continue;
        }
        if (next_menu) {
          if (next_menu === menu.id) {
            first_child = menu.first_child ? menu.first_child : null;
            next_menu = menu.next_menu ? menu.next_menu : null;
            let children = [
              ...treeStructuredMenus[parentCurrentIndex]["children"],
            ];
            if (Object.keys(permissions).includes(menu.path)) {
              const sub_menu_data = { ...menu, ...permissions[menu.path] };
              const data = {
                title: menu.alias_name,
                data: sub_menu_data,
                id: menu.id,
                subtitle: menu.path,
              };
              children.push(data);
              treeStructuredMenus[parentCurrentIndex]["children"] = children;
            }
            dataFound = true;
            idsConsidered.push(menu.id);
          }
          continue;
        }
        if (treeStructuredMenus.length === 0 || parent_next_menu === menu.id) {
          idsConsidered.push(menu.id);
          parentCurrentIndex = treeStructuredMenus.length;
          parentData = {
            title: menu.alias_name,
            data: menu,
            id: menu.id,
            subtitle: menu.path,
            children: [],
            expanded: true,
          };
          treeStructuredMenus.push(parentData);
          first_child = menu.first_child ? menu.first_child : null;
          parent_next_menu = menu["next_menu"] ? menu["next_menu"] : null;

          dataFound = true;
          continue;
        }
      }
    }
  }
  return treeStructuredMenus;
};

export const getMobileApplicationSetting = (oldData,is_staff_app) => {
  let MobileApplication = {};
  oldData.map((data) => {
    let splitted_code = data["action_code"].split("_");
    if(is_staff_app){ 
      splitted_code=splitted_code.slice(1, splitted_code.length)
    }
    let action_code = splitted_code
    .slice(1, splitted_code.length - 1)
    .join("_");
    if (!MobileApplication[action_code]) {
      MobileApplication[action_code] = {
        name: data["name"],
        type: data["module"],
        menu_type: data["menu_type"] ? data["menu_type"] : "app",
      };
    }
    MobileApplication[action_code][data["type"]] = {
      codenames: data["codenames"],
      action_code: data["action_code"],
      is_superuser_action: data["is_superuser_action"],
      name: data["name"],
      label: data["name"],
      action: data["action"],
      url: data["screen"],
      roles: data["roles"],
      component: null,
      permission_needed: data["permission_needed"],
    };
  });
  return MobileApplication
};
