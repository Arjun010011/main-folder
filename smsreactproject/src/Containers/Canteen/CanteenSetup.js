import React, { Component } from 'react';
import { Box, Typography } from '@material-ui/core';
import {
    Settings as SettingsIcon,
    Restaurant as MenuIcon,
    Fastfood as FoodIcon,
    CardMembership as PackageIcon,
    Today as TodayIcon,
    Assignment as RequestIcon,
} from '@material-ui/icons';
import { isUserHasPermission } from 'Includes/functions';
import S from './canteenStyles';

import FoodCategoryList from './FoodCategoryList';
import FoodItemList from './FoodItemList';
import FoodComboList from './FoodComboList';
import MenuList from './MenuList';
import MealPackageList from './MealPackageList';
import TodaysMenuSetup from './TodaysMenuSetup';
import FoodRequestConfig from './FoodRequestConfig';

const TABS = [
    { key: 'categories', label: 'Food Categories', icon: FoodIcon, perm: 'food_category' },
    { key: 'items', label: 'Food Items', icon: FoodIcon, perm: 'food_item' },
    { key: 'combos', label: 'Combos', icon: FoodIcon, perm: 'food_combo' },
    { key: 'menus', label: 'Menu Mgmt', icon: MenuIcon, perm: 'canteen_menu' },
    { key: 'todaysSetup', label: "Today's Menu", icon: TodayIcon, perm: 'canteen_todays_menu_setup' },
    { key: 'packages', label: 'Packages', icon: PackageIcon, perm: 'meal_package' },
    { key: 'requestConfig', label: 'Request Config', icon: RequestIcon, perm: 'food_request_config' },
];

class CanteenSetup extends Component {
    constructor(props) {
        super(props);
        const visibleTabs = TABS.filter(t => isUserHasPermission(t.perm, 'view'));
        this.state = { activeTab: visibleTabs.length > 0 ? visibleTabs[0].key : 'categories' };
    }

    renderTab = () => {
        const { activeTab } = this.state;
        const p = this.props;
        switch (activeTab) {
            case 'categories': return <FoodCategoryList {...p} />;
            case 'items': return <FoodItemList {...p} />;
            case 'combos': return <FoodComboList {...p} />;
            case 'menus': return <MenuList {...p} />;
            case 'todaysSetup': return <TodaysMenuSetup {...p} />;
            case 'packages': return <MealPackageList {...p} />;
            case 'requestConfig': return <FoodRequestConfig {...p} />;
            default: return <FoodCategoryList {...p} />;
        }
    };

    render() {
        const { activeTab } = this.state;
        const visibleTabs = TABS.filter(t => isUserHasPermission(t.perm, 'view'));
        return (
            <Box style={S.pageContainer}>
                {/* Header */}
                <Box style={S.header}>
                    <Box>
                        <Typography style={S.headerTitle}><SettingsIcon style={{ fontSize: '28px' }} /> Canteen Setup</Typography>
                        <Typography style={S.headerSubtitle}>Manage food catalog, menus, and packages</Typography>
                    </Box>
                </Box>

                {/* Tab Bar */}
                <Box style={S.tabBar}>
                    {visibleTabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => this.setState({ activeTab: t.key })}>
                                <Icon style={{ fontSize: '16px' }} /> {t.label}
                            </button>
                        );
                    })}
                </Box>

                {/* Tab Content */}
                <Box>{this.renderTab()}</Box>
            </Box>
        );
    }
}

export default CanteenSetup;
