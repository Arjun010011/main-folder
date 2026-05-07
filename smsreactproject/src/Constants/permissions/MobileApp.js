const Actions = {
    driver_ridedetail: {
        view: {
            codenames: ['transport/ridedetail/'],
            action_code: 'app_driver_ridedetail_view',
            is_superuser_action: false,
            name: 'Transport Ride Status',
            label: 'Transport Ride Status',
            action: 'sub-menu',
            url: 'DriverIndex',
            component: null,
            permission_needed: true,
        },
        name: 'Transport Ride Status',
        type: 'Transport',
        menu_type: 'app',
    },

}

export default Actions