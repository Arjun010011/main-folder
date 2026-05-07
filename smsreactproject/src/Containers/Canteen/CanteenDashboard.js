import React, { Component } from 'react';
import { Box, Typography } from '@material-ui/core';
import {
    Dashboard as DashboardIcon,
    Restaurant as MenuIcon,
    ShoppingCart as OrderIcon,
    AccountBalanceWallet as WalletIcon,
    LocalOffer as DiscountIcon,
    Subscriptions as SubsIcon,
    Assignment as RequestIcon,
} from '@material-ui/icons';
import { isUserHasPermission } from 'Includes/functions';
import S from './canteenStyles';

import TabDashboard from './TabDashboard';
import TabTodaysMenu from './TabTodaysMenu';
import TabOrders from './TabOrders';
import TabWallets from './TabWallets';
import TabDiscounts from './TabDiscounts';
import TabSubscriptions from './TabSubscriptions';
import FoodRequestKitchen from './FoodRequestKitchen';
import FoodRequestPage from './FoodRequestPage';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon, perm: 'canteen_dashboard' },
    { key: 'todaysMenu', label: "Today's Menu", icon: MenuIcon, perm: 'canteen_todays_menu' },
    { key: 'orders', label: 'Orders', icon: OrderIcon, perm: 'canteen_order' },
    { key: 'wallets', label: 'Wallets', icon: WalletIcon, perm: 'canteen_wallet' },
    { key: 'discounts', label: 'Discounts', icon: DiscountIcon, perm: 'menu_discount' },
    { key: 'subscriptions', label: 'Subscriptions', icon: SubsIcon, perm: 'meal_package_subscription' },
    { key: 'foodRequests', label: 'Food Requests', icon: RequestIcon, perm: 'food_request' },
];

class CanteenDashboard extends Component {
    constructor(props) {
        super(props);
        const visibleTabs = TABS.filter(t => isUserHasPermission(t.perm, 'view'));
        this.state = { activeTab: visibleTabs.length > 0 ? visibleTabs[0].key : 'dashboard' };
    }

    renderTab = () => {
        const { activeTab } = this.state;
        const p = this.props;
        switch (activeTab) {
            case 'dashboard': return <TabDashboard {...p} />;
            case 'todaysMenu': return <TabTodaysMenu {...p} />;
            case 'orders': return <TabOrders {...p} />;
            case 'wallets': return <TabWallets {...p} />;
            case 'discounts': return <TabDiscounts {...p} />;
            case 'subscriptions': return <TabSubscriptions {...p} />;
            case 'foodRequests':
                return isUserHasPermission('food_request', 'change')
                    ? <FoodRequestKitchen {...p} />
                    : <FoodRequestPage {...p} />;
            default: return <TabDashboard {...p} />;
        }
    };

    render() {
        const { activeTab } = this.state;
        const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const visibleTabs = TABS.filter(t => isUserHasPermission(t.perm, 'view'));
        return (
            <Box style={S.pageContainer}>
                {/* Header */}
                <Box style={S.header}>
                    <Box>
                        <Typography style={S.headerTitle}>🍽️ Canteen</Typography>
                        <Typography style={S.headerSubtitle}>{today}</Typography>
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

export default CanteenDashboard;
