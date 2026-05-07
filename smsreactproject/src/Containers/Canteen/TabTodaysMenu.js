import React, { Component } from 'react';
import { Box, Grid, Typography, IconButton, TextField, InputAdornment, Chip, Badge, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, RadioGroup, FormControlLabel, Radio } from '@material-ui/core';
import { Add as AddIcon, Remove as RemoveIcon, ShoppingCart as CartIcon, Search as SearchIcon, Close as CloseIcon, Delete as DeleteIcon, Restaurant as RestaurantIcon, LocalCafe as CafeIcon, Fastfood as FastfoodIcon, NightsStay as DinnerIcon } from '@material-ui/icons';
import Swal from 'sweetalert2';
import InfiniteScroll from 'react-infinite-scroller';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import S from './canteenStyles';
import loadingBar from 'images/loading.gif';

const MEAL_TYPES = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner' };
const MEAL_ICONS = { 0: CafeIcon, 1: RestaurantIcon, 2: FastfoodIcon, 3: DinnerIcon };
const PAYMENT_MODES = [
    { id: 0, label: 'Wallet', icon: '💳' },
    { id: 1, label: 'Cash', icon: '💵' },
    { id: 2, label: 'UPI', icon: '📱' },
    { id: 3, label: 'Cheque', icon: '📝' },
    { id: 4, label: 'Card', icon: '💳' },
    { id: 5, label: 'Online', icon: '🌐' },
];

class TabTodaysMenu extends Component {
    state = {
        loading: true, menuItems: [], filteredItems: [], searchQuery: '', selectedMealType: null,
        selectedCategory: null, // null = all, 'combo' = combos, or category id
        categories: [], // dynamic from API
        cart: [], hoveredCard: null,
        checkoutOpen: false, paymentMode: 1, notes: '', discount: 0, submitting: false, lastOrderData: null, generateReceipt: true,
        comboDialogOpen: false, pendingCombo: null, comboOptionSelections: {},
        // user search for wallet payment
        userSearch: '', userResults: [], selectedUser: null, loadingUsers: false,
        // pagination
        currentPage: 1, hasMore: true, loadingMore: false, totalCount: 0,
    };

    componentDidMount() { this.loadTodaysMenu(); this.loadCategories(); }

    loadCategories = () => {
        getRequest(GET_URL.food_category.api, { is_active: true, limit: 15, pageno: 1 }, this.props).then(res => {
            if (res && res.status === 200) {
                const list = res.data.data?.data_list || res.data.data || [];
                this.setState({ categories: Array.isArray(list) ? list : [] });
            }
        });
    };

    loadTodaysMenu = (append = false) => {
        const { menuItems, loadingMore, currentPage } = this.state;
        if (append && loadingMore) return;

        const pageno = append ? currentPage : 1;
        this.setState(append ? { loadingMore: true } : { loading: true });

        getRequest(GET_URL.canteen_menu.api, { is_active: true, action: 'todays_menu', limit: 20, pageno }, this.props).then((res) => {
            if (res && res.status === 200) {
                const data = res.data?.data || {};
                const menus = data.data_list || data || [];
                const totalCount = data.count || 0;

                // Flatten all available items from all menus
                const newItems = [];
                (Array.isArray(menus) ? menus : []).forEach(menu => {
                    (menu.items || []).forEach(item => {
                        newItems.push({ ...item, menu });
                    });
                });

                let allItems;
                if (append) {
                    const existingIds = new Set(menuItems.map(i => i.id));
                    const uniqueNew = newItems.filter(i => !existingIds.has(i.id));
                    allItems = [...menuItems, ...uniqueNew];
                } else {
                    allItems = newItems;
                }

                const hasMore = data.next !== null && data.next !== undefined;

                this.setState({
                    menuItems: allItems,
                    loading: false,
                    loadingMore: false,
                    totalCount,
                    hasMore,
                    currentPage: pageno + 1,
                }, this.applyFilters);
            } else {
                this.setState({ loading: false, loadingMore: false });
            }
        });
    };

    loadMoreMenus = () => {
        const { loadingMore, hasMore } = this.state;
        if (loadingMore || !hasMore) return;
        this.loadTodaysMenu(true);
    };

    applyFilters = () => {
        const { menuItems, searchQuery, selectedMealType, selectedCategory } = this.state;
        let f = [...menuItems];
        // Meal type filter
        if (selectedMealType !== null) f = f.filter(mi => mi.menu && (typeof mi.menu === 'object' ? mi.menu.meal_type : null) === selectedMealType);
        // Category filter
        if (selectedCategory === 'combo') {
            f = f.filter(mi => mi.combo && typeof mi.combo === 'object');
        } else if (selectedCategory !== null) {
            f = f.filter(mi => {
                if (!mi.food_item || typeof mi.food_item !== 'object') return false;
                const cat = mi.food_item.category;
                const catId = typeof cat === 'object' ? cat?.id : cat;
                return catId === selectedCategory;
            });
        }
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            f = f.filter(mi => {
                const fn = mi.food_item && typeof mi.food_item === 'object' ? mi.food_item.name : '';
                const cn = mi.combo && typeof mi.combo === 'object' ? mi.combo.name : '';
                return fn.toLowerCase().includes(q) || cn.toLowerCase().includes(q);
            });
        }
        this.setState({ filteredItems: f });
    };

    getItemInfo = (mi) => {
        const fi = mi.food_item && typeof mi.food_item === 'object' ? mi.food_item : null;
        const combo = mi.combo && typeof mi.combo === 'object' ? mi.combo : null;
        return {
            name: fi ? fi.name : combo ? combo.name : 'Unknown',
            category: fi?.category ? (typeof fi.category === 'object' ? fi.category.name : '') : '',
            isCombo: !!combo,
            price: parseFloat(mi.price || fi?.cost || combo?.price || 0),
            qtyAvail: mi.quantity_available, qtySold: mi.quantity_sold || 0,
            foodType: fi?.food_type,
        };
    };

    getAvailMealTypes = () => {
        const s = new Set();
        this.state.menuItems.forEach(mi => { if (mi.menu && typeof mi.menu === 'object') s.add(mi.menu.meal_type); });
        return Array.from(s).sort();
    };

    /* ── Cart ── */
    addToCart = (mi) => {
        const isCombo = !!mi.combo && typeof mi.combo === 'object' && mi.combo.option_groups?.length > 0;
        if (isCombo) {
            const init = {}; mi.combo.option_groups.forEach(g => { init[g.id] = []; });
            this.setState({ comboDialogOpen: true, pendingCombo: mi, comboOptionSelections: init });
            return;
        }
        this.addItemDirectly(mi, []);
    };

    addItemDirectly = (mi, selectedOpts) => {
        const { cart } = this.state;
        const info = this.getItemInfo(mi);
        const remaining = info.qtyAvail != null ? info.qtyAvail - info.qtySold : null;
        let optExtra = 0; const optLabels = [];
        selectedOpts.forEach(o => { optExtra += parseFloat(o.extra_price || 0); optLabels.push(o.food_item?.name || `Opt#${o.id}`); });
        const cartKey = `${mi.id}_${selectedOpts.map(o => o.id).sort().join(',')}`;
        const existing = cart.find(c => c.cartKey === cartKey);
        const currentInCart = existing ? existing.quantity : 0;

        // Check available quantity
        if (remaining !== null && currentInCart >= remaining) {
            Swal.fire({ icon: 'warning', title: 'Stock limit', text: `Only ${remaining} available for "${info.name}"`, timer: 2000, showConfirmButton: false });
            return;
        }

        if (existing) {
            existing.quantity += 1;
            existing.total = (info.price + optExtra) * existing.quantity;
            this.setState({ cart: [...cart] });
        } else {
            cart.push({ cartKey, menuItem: mi, name: info.name, unitPrice: info.price + optExtra, quantity: 1, total: info.price + optExtra, selectedOpts, optLabels, isCombo: info.isCombo, maxQty: remaining });
            this.setState({ cart: [...cart] });
        }
    };

    updateQty = (key, d) => {
        const { cart } = this.state; const item = cart.find(c => c.cartKey === key); if (!item) return;
        const newQty = item.quantity + d;
        if (newQty <= 0) { this.setState({ cart: cart.filter(c => c.cartKey !== key) }); return; }
        if (item.maxQty !== null && item.maxQty !== undefined && newQty > item.maxQty) {
            Swal.fire({ icon: 'warning', title: 'Stock limit', text: `Only ${item.maxQty} available`, timer: 1500, showConfirmButton: false });
            return;
        }
        item.quantity = newQty;
        item.total = item.unitPrice * newQty;
        this.setState({ cart: [...cart] });
    };

    setQty = (key, val) => {
        const { cart } = this.state; const item = cart.find(c => c.cartKey === key); if (!item) return;
        const n = parseInt(val) || 0;
        if (n <= 0) { this.setState({ cart: cart.filter(c => c.cartKey !== key) }); return; }
        if (item.maxQty !== null && item.maxQty !== undefined && n > item.maxQty) {
            Swal.fire({ icon: 'warning', title: 'Stock limit', text: `Only ${item.maxQty} available`, timer: 1500, showConfirmButton: false });
            item.quantity = item.maxQty; item.total = item.unitPrice * item.maxQty;
            this.setState({ cart: [...cart] }); return;
        }
        item.quantity = n; item.total = item.unitPrice * n;
        this.setState({ cart: [...cart] });
    };

    /* ── Combo options ── */
    toggleComboOpt = (gId, opt, max) => {
        const { comboOptionSelections: s } = this.state; const cur = s[gId] || [];
        const exists = cur.find(o => o.id === opt.id); let upd;
        if (exists) upd = cur.filter(o => o.id !== opt.id);
        else if (cur.length >= max) { if (max === 1) upd = [opt]; else return; }
        else upd = [...cur, opt];
        this.setState({ comboOptionSelections: { ...s, [gId]: upd } });
    };

    confirmCombo = () => {
        const { pendingCombo: pc, comboOptionSelections: s } = this.state; if (!pc) return;
        for (const g of (pc.combo?.option_groups || [])) {
            if ((s[g.id]?.length || 0) < g.min_select) { Swal.fire({ icon: 'warning', title: 'Selection Required', text: `Select at least ${g.min_select} for "${g.name}".` }); return; }
        }
        this.addItemDirectly(pc, Object.values(s).flat());
        this.setState({ comboDialogOpen: false, pendingCombo: null, comboOptionSelections: {} });
    };

    /* ── Checkout ── */
    getSubtotal = () => this.state.cart.reduce((s, c) => s + c.total, 0);
    getNet = () => Math.max(0, this.getSubtotal() - parseFloat(this.state.discount || 0));

    searchUsers = (q) => {
        this.setState({ userSearch: q, loadingUsers: true });
        if (!q.trim()) { this.setState({ userResults: [], loadingUsers: false }); return; }
        getRequest(GET_URL.canteen_wallet.api, { is_active: true, search: q, limit: 10 }, this.props).then(res => {
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            this.setState({ userResults: Array.isArray(list) ? list : [], loadingUsers: false });
        }).catch(() => this.setState({ loadingUsers: false }));
    };

    submitOrder = () => {
        this.setState({ submitting: true });
        const { cart, paymentMode, notes, discount, selectedUser, generateReceipt } = this.state;
        const items = cart.map(ci => {
            const mi = ci.menuItem; const item = { menu_item: mi.id, quantity: ci.quantity };
            if (mi.food_item) item.food_item = typeof mi.food_item === 'object' ? mi.food_item.id : mi.food_item;
            if (mi.combo) item.combo = typeof mi.combo === 'object' ? mi.combo.id : mi.combo;
            if (ci.selectedOpts.length) item.combo_options = ci.selectedOpts.map(o => o.id);
            return item;
        });
        const payload = { order_type: 0, payment_mode: paymentMode, discount_amount: parseFloat(discount || 0).toFixed(2), notes: notes || '', items };

        postRequest(POST_URL.canteen_order.api, payload, this.props).then(res => {
            if (res && (res.status === 200 || res.status === 201)) {
                const orderId = res.data?.data?.id;
                this.setState({ submitting: false, checkoutOpen: false, cart: [], discount: 0, notes: '', selectedUser: null });

                if (generateReceipt && orderId) {
                    const receiptUrl = GET_URL.canteen_order.api + orderId + '/?receipt=true';
                    getRequest(receiptUrl, {}, { ...this.props, responseType: "blob" }).then((response) => {
                        if (response && response.status === 200) {
                            const data = new Blob([response.data], { type: "application/pdf" });
                            const fileURL = URL.createObjectURL(data);
                            const height = (window.screen.height * 90) / 100;
                            const width = (window.screen.width * 80) / 100;
                            window.open(fileURL, "CanteenReceipt", `height=${height},width=${width}`);
                        }
                    });
                }

                Swal.fire({ position: 'top-end', icon: 'success', title: 'Order placed!', showConfirmButton: false, timer: 1500 });
            } else this.setState({ submitting: false });
        }).catch(() => this.setState({ submitting: false }));
    };

    render() {
        const { loading, filteredItems, searchQuery, selectedMealType, cart, hoveredCard, checkoutOpen, paymentMode, notes, discount, submitting, comboDialogOpen, pendingCombo, comboOptionSelections } = this.state;
        if (loading) return <Box display="flex" justifyContent="center" p={6}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        const subtotal = this.getSubtotal(); const net = this.getNet();
        const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
        const availMeals = this.getAvailMealTypes();

        return (
            <Box>
                <Grid container spacing={2}>
                    {/* LEFT — Menu Items */}
                    <Grid item xs={12} md={8}>
                        {/* Meal filter */}
                        <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <Box style={S.mealChip(selectedMealType === null)} onClick={() => this.setState({ selectedMealType: null }, this.applyFilters)}>All</Box>
                            {Object.entries(MEAL_TYPES).map(([k, l]) => {
                                const I = MEAL_ICONS[k]; if (!availMeals.includes(parseInt(k))) return null;
                                return <Box key={k} style={S.mealChip(selectedMealType === parseInt(k))} onClick={() => this.setState(p => ({ selectedMealType: p.selectedMealType === parseInt(k) ? null : parseInt(k) }), this.applyFilters)}><I style={{ fontSize: '16px' }} /> {l}</Box>;
                            })}
                        </Box>
                        {/* Category filter */}
                        {this.state.categories.length > 0 && (
                            <Box style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                <Box style={{ ...S.mealChip(this.state.selectedCategory === null), fontSize: '12px', padding: '4px 12px' }}
                                    onClick={() => this.setState({ selectedCategory: null }, this.applyFilters)}>All Items</Box>
                                <Box style={{ ...S.mealChip(this.state.selectedCategory === 'combo'), fontSize: '12px', padding: '4px 12px', ...(this.state.selectedCategory === 'combo' ? { background: 'linear-gradient(135deg, #FF6B35, #FFA726)', color: '#fff' } : {}) }}
                                    onClick={() => this.setState(p => ({ selectedCategory: p.selectedCategory === 'combo' ? null : 'combo' }), this.applyFilters)}>🍱 Combos</Box>
                                {this.state.categories.map(cat => (
                                    <Box key={cat.id}
                                        style={{ ...S.mealChip(this.state.selectedCategory === cat.id), fontSize: '12px', padding: '4px 12px' }}
                                        onClick={() => this.setState(p => ({ selectedCategory: p.selectedCategory === cat.id ? null : cat.id }), this.applyFilters)}>
                                        {cat.name}
                                    </Box>
                                ))}
                            </Box>
                        )}
                        {/* Search */}
                        <Box style={{ marginBottom: '14px' }}>
                            <input style={S.searchBox} placeholder="Search food items or combos..." value={searchQuery}
                                onChange={e => this.setState({ searchQuery: e.target.value }, this.applyFilters)} />
                        </Box>
                        {/* Items grid */}
                        <Box id="menu-scroll-container" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                            {filteredItems.length === 0 ? (
                                <Box style={S.emptyState}><RestaurantIcon style={S.emptyIcon} /><Typography variant="h6" style={{ color: '#aaa' }}>No menu items found</Typography></Box>
                            ) : (
                                <InfiniteScroll
                                    pageStart={0}
                                    loadMore={this.loadMoreMenus}
                                    hasMore={this.state.hasMore && !this.state.loadingMore}
                                    useWindow={false}
                                    getScrollParent={() => document.getElementById('menu-scroll-container')}
                                >
                                    <Grid container spacing={2}>
                                        {filteredItems.map(mi => {
                                            const info = this.getItemInfo(mi); const hov = hoveredCard === mi.id;
                                            const remaining = info.qtyAvail != null ? info.qtyAvail - info.qtySold : null;
                                            return (
                                                <Grid item xs={6} sm={4} md={3} key={mi.id}>
                                                    <Box style={{ ...S.menuItemCard, ...(hov ? S.cardHover : {}) }}
                                                        onMouseEnter={() => this.setState({ hoveredCard: mi.id })}
                                                        onMouseLeave={() => this.setState({ hoveredCard: null })}
                                                        onClick={() => {
                                                            if (remaining !== null && remaining <= 0) { Swal.fire({ icon: 'error', title: 'Sold out', text: `"${info.name}" is sold out`, timer: 1500, showConfirmButton: false }); return; }
                                                            this.addToCart(mi);
                                                        }}>
                                                        <Box style={{ height: '5px', background: info.isCombo ? 'linear-gradient(90deg,#FF6B35,#FFA726)' : `linear-gradient(90deg,${S.COLORS.primary},${S.COLORS.primaryLight})` }} />
                                                        <Box style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                            <Box>
                                                                <Box style={S.vegBadge(info.foodType)}>{info.isCombo ? 'Combo' : info.foodType === 0 ? 'Veg' : info.foodType === 1 ? 'Non-Veg' : 'Egg'}</Box>
                                                                <Box style={S.menuItemName}>{info.name}</Box>
                                                                {info.category && <Box style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{info.category}</Box>}
                                                            </Box>
                                                            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                                <Box style={S.menuItemPrice}>₹{info.price.toFixed(2)}</Box>
                                                                {remaining !== null && <Box style={{ fontSize: '11px', color: remaining <= 5 ? '#d32f2f' : '#888', fontWeight: remaining <= 5 ? 600 : 400 }}>{remaining <= 0 ? 'Sold out' : `${remaining} left`}</Box>}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                    {this.state.loadingMore && (
                                        <Box style={{ textAlign: 'center', padding: '16px' }}>
                                            <img src={loadingBar} className="loading" alt="loading" style={{ width: '30px' }} />
                                        </Box>
                                    )}
                                </InfiniteScroll>
                            )}
                        </Box>
                    </Grid>

                    {/* RIGHT — Cart */}
                    <Grid item xs={12} md={4}>
                        <Box style={S.cartPanel}>
                            <Box style={S.cardHeader}>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Badge badgeContent={totalItems} color="error" invisible={totalItems === 0}><CartIcon /></Badge>
                                    <Typography style={{ fontWeight: 700, fontSize: '16px' }}>Cart</Typography>
                                </Box>
                                {cart.length > 0 && <Tooltip title="Clear"><IconButton size="small" style={{ color: 'white' }} onClick={() => this.setState({ cart: [] })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                            </Box>
                            <Box style={{ flex: 1, overflowY: 'auto', padding: '12px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                                {cart.length === 0 ? (
                                    <Box style={S.emptyState}><CartIcon style={{ fontSize: '50px', color: '#ddd', marginBottom: '12px' }} /><Typography style={{ fontSize: '14px', color: '#ccc' }}>Cart is empty</Typography></Box>
                                ) : cart.map(ci => (
                                    <Box key={ci.cartKey} style={S.cartItem}>
                                        <Box style={{ flex: 1, marginRight: '8px' }}>
                                            <Box style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{ci.isCombo && <Chip label="C" size="small" style={{ height: '16px', fontSize: '10px', marginRight: '4px', background: '#FFF3E0', color: '#E65100' }} />}{ci.name}</Box>
                                            {ci.optLabels.length > 0 && <Box style={{ fontSize: '11px', color: '#888' }}>{ci.optLabels.join(', ')}</Box>}
                                            <Box style={{ fontSize: '12px', color: S.COLORS.primary, fontWeight: 600, marginTop: '2px' }}>₹{ci.total.toFixed(2)}</Box>
                                        </Box>
                                        <Box style={S.qtyControl}>
                                            <button style={S.qtyBtn} onClick={() => this.updateQty(ci.cartKey, -1)}>−</button>
                                            <input
                                                type="number"
                                                value={ci.quantity}
                                                onChange={(e) => this.setQty(ci.cartKey, e.target.value)}
                                                style={{ width: '40px', textAlign: 'center', fontSize: '14px', fontWeight: 700, border: '1px solid #ddd', borderRadius: '4px', outline: 'none', padding: '2px 0', MozAppearance: 'textfield', WebkitAppearance: 'none' }}
                                                min="1"
                                            />
                                            <button style={S.qtyBtn} onClick={() => this.updateQty(ci.cartKey, 1)}>+</button>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                            {cart.length > 0 && (
                                <Box style={{ padding: '14px 18px', borderTop: `2px solid ${S.COLORS.border}` }}>
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#555', padding: '4px 0' }}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></Box>
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 700, color: S.COLORS.primary, padding: '8px 0', borderTop: '2px dashed #e0e0e0', marginTop: '6px' }}><span>Total</span><span>₹{net.toFixed(2)}</span></Box>
                                    <button style={{ ...S.successBtn, width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }} onClick={() => this.setState({ checkoutOpen: true })}>
                                        Place Order
                                    </button>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                {/* ═══ CHECKOUT DIALOG ═══ */}
                <Dialog open={checkoutOpen} onClose={() => this.setState({ checkoutOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Checkout</Box></DialogTitle>
                    <DialogContent style={{ padding: '24px' }}>
                        <Box style={S.formGroup}>
                            <Box style={S.formLabel}>Payment Mode</Box>
                            <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {PAYMENT_MODES.map(pm => (
                                    <Box key={pm.id} style={{ ...S.mealChip(paymentMode === pm.id), cursor: 'pointer', fontSize: '13px' }} onClick={() => this.setState({ paymentMode: pm.id })}>{pm.icon} {pm.label}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box style={S.formRow}>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>Discount (₹)</Box>
                                <input style={S.formInput} type="number" min="0" value={discount} onChange={e => this.setState({ discount: e.target.value })} />
                            </Box>
                        </Box>
                        <Box style={S.formGroup}>
                            <Box style={S.formLabel}>Notes</Box>
                            <input style={S.formInput} placeholder="Optional notes..." value={notes} onChange={e => this.setState({ notes: e.target.value })} />
                        </Box>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="generateReceipt" checked={this.state.generateReceipt}
                                onChange={e => this.setState({ generateReceipt: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: S.COLORS.primary, cursor: 'pointer' }} />
                            <label htmlFor="generateReceipt" style={{ fontSize: '13px', fontWeight: 600, color: '#333', cursor: 'pointer' }}>🧾 Generate Receipt</label>
                        </Box>
                        <Box style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: S.COLORS.primary, padding: '12px 0', borderTop: `2px solid ${S.COLORS.border}`, marginTop: '8px' }}>
                            <span>Pay</span><span>₹{this.getNet().toFixed(2)}</span>
                        </Box>
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 24px 20px' }}>
                        <Button onClick={() => this.setState({ checkoutOpen: false })}>Cancel</Button>
                        <button style={S.successBtn} onClick={this.submitOrder} disabled={submitting}>
                            {submitting ? 'Processing...' : 'Confirm Order'}
                        </button>
                    </DialogActions>
                </Dialog>

                {/* ═══ COMBO OPTIONS DIALOG ═══ */}
                <Dialog open={comboDialogOpen} onClose={() => this.setState({ comboDialogOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Customize Combo</Box></DialogTitle>
                    <DialogContent style={{ padding: '24px' }}>
                        {pendingCombo?.combo?.option_groups?.map(grp => (
                            <Box key={grp.id} style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: S.COLORS.surface, border: `1px solid ${S.COLORS.border}` }}>
                                <Box style={{ fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>{grp.name} <span style={{ fontSize: '11px', color: '#888', fontWeight: 400 }}>(select {grp.min_select}–{grp.max_select})</span></Box>
                                {grp.options?.map(opt => {
                                    const sel = (comboOptionSelections[grp.id] || []).find(o => o.id === opt.id);
                                    return (
                                        <Box key={opt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px', background: sel ? S.COLORS.primaryBg : 'white', border: sel ? `1px solid ${S.COLORS.primaryLight}` : '1px solid #eee' }}
                                            onClick={() => this.toggleComboOpt(grp.id, opt, grp.max_select)}>
                                            <span style={{ fontSize: '13px' }}>{opt.food_item?.name || `Option #${opt.id}`}</span>
                                            {parseFloat(opt.extra_price || 0) > 0 && <span style={{ fontSize: '12px', color: S.COLORS.warning, fontWeight: 600 }}>+₹{opt.extra_price}</span>}
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))}
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 24px 20px' }}>
                        <Button onClick={() => this.setState({ comboDialogOpen: false })}>Cancel</Button>
                        <button style={S.primaryBtn} onClick={this.confirmCombo}>Add to Cart</button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default TabTodaysMenu;
