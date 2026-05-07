/* ═══════════════ CANTEEN DASHBOARD STYLES ═══════════════ */
const COLORS = {
    primary: '#1C52C8',
    primaryLight: '#4680FF',
    primaryBg: '#EBF1FF',
    surface: '#F7F9FE',
    border: '#e8ecf3',
    text: '#333',
    textSecondary: '#666',
    textMuted: '#999',
    success: '#2E7D32',
    successBg: '#E8F5E9',
    warning: '#E65100',
    warningBg: '#FFF3E0',
    danger: '#d32f2f',
    dangerBg: '#FFEBEE',
    white: '#fff',
};

const canteenStyles = {
    COLORS,
    /* ── Page ── */
    pageContainer: { padding: '16px', minHeight: 'calc(100vh - 80px)', background: '#f5f6fa' },
    header: {
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
        borderRadius: '14px', padding: '18px 28px', color: COLORS.white, marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(24,99,254,0.25)',
    },
    headerTitle: { fontSize: '24px', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px' },
    headerSubtitle: { fontSize: '13px', opacity: 0.85, marginTop: '2px' },

    /* ── Tabs ── */
    tabBar: {
        display: 'flex', gap: '6px', marginBottom: '20px', background: COLORS.white,
        borderRadius: '12px', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: `1px solid ${COLORS.border}`, flexWrap: 'wrap',
    },
    tab: (active) => ({
        padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px',
        background: active ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})` : 'transparent',
        color: active ? COLORS.white : COLORS.textSecondary,
        boxShadow: active ? '0 3px 12px rgba(24,99,254,0.25)' : 'none',
        border: 'none', outline: 'none',
    }),

    /* ── Cards ── */
    card: {
        background: COLORS.white, borderRadius: '12px', border: `1px solid ${COLORS.border}`,
        overflow: 'hidden', transition: 'all 0.25s ease',
    },
    cardHover: { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(24,99,254,0.12)', borderColor: COLORS.primaryLight },
    cardHeader: {
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        color: COLORS.white, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    cardBody: { padding: '16px' },

    /* ── Sections ── */
    sectionTitle: { fontSize: '16px', fontWeight: 700, color: COLORS.text, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    emptyState: { textAlign: 'center', padding: '50px 20px', color: COLORS.textMuted },
    emptyIcon: { fontSize: '60px', color: '#ddd', marginBottom: '12px' },

    /* ── Buttons ── */
    primaryBtn: {
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        color: COLORS.white, border: 'none', borderRadius: '8px', padding: '10px 20px',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: '0 3px 10px rgba(24,99,254,0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px',
    },
    successBtn: {
        background: 'linear-gradient(180deg, #99d156 0%, #5e9824 100%)',
        color: COLORS.white, border: 'none', borderRadius: '8px', padding: '10px 20px',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(94,152,36,0.25)',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
    },
    outlineBtn: {
        background: 'transparent', color: COLORS.primary, border: `2px solid ${COLORS.primary}`,
        borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px',
    },
    dangerBtn: {
        background: COLORS.danger, color: COLORS.white, border: 'none', borderRadius: '8px',
        padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    },

    /* ── Chips/Badges ── */
    statusChip: (color, bg) => ({
        display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
        fontWeight: 700, color, backgroundColor: bg, textTransform: 'uppercase', letterSpacing: '0.4px',
    }),
    vegBadge: (type) => ({
        display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
        backgroundColor: type === 0 ? '#E8F5E9' : type === 1 ? '#FFEBEE' : '#FFF8E1',
        color: type === 0 ? '#2E7D32' : type === 1 ? '#C62828' : '#F57F17',
    }),

    /* ── Search ── */
    searchBox: {
        borderRadius: '10px', background: COLORS.white, border: `1px solid ${COLORS.border}`,
        padding: '8px 14px', fontSize: '14px', width: '100%', outline: 'none',
        transition: 'border-color 0.2s',
    },

    /* ── Wallet ── */
    walletCard: {
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        borderRadius: '16px', padding: '24px', color: COLORS.white,
        boxShadow: '0 8px 30px rgba(24,99,254,0.3)', position: 'relative', overflow: 'hidden',
    },
    walletBalance: { fontSize: '36px', fontWeight: 800, marginTop: '8px' },
    walletLabel: { fontSize: '13px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' },

    /* ── Table ── */
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' },
    th: {
        textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 700,
        color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px',
        borderBottom: `2px solid ${COLORS.border}`,
    },
    td: {
        padding: '12px 14px', fontSize: '13px', color: COLORS.text,
        background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
    },

    /* ── Dialog ── */
    dialogHeader: {
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        color: COLORS.white, padding: '16px 24px',
    },
    dialogHeaderTitle: { fontSize: '18px', fontWeight: 700 },

    /* ── Forms ── */
    formGroup: { marginBottom: '16px' },
    formLabel: { display: 'block', fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    formInput: {
        width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`,
        fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    },
    formSelect: {
        width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`,
        fontSize: '14px', outline: 'none', background: COLORS.white, boxSizing: 'border-box',
    },
    formRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    formCol: { flex: 1, minWidth: '200px' },

    /* ── POS ── */
    mealChip: (active) => ({
        padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s',
        border: active ? `2px solid ${COLORS.primary}` : '2px solid #e0e0e0',
        background: active ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})` : COLORS.surface,
        color: active ? COLORS.white : COLORS.textSecondary,
        boxShadow: active ? '0 3px 10px rgba(24,99,254,0.25)' : 'none',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
    }),
    menuItemCard: {
        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s ease',
        border: `1px solid ${COLORS.border}`, background: COLORS.white, height: '100%',
        display: 'flex', flexDirection: 'column',
    },
    menuItemName: { fontSize: '14px', fontWeight: 600, color: COLORS.text, marginBottom: '4px', lineHeight: 1.3 },
    menuItemPrice: { fontSize: '18px', fontWeight: 700, color: COLORS.primary },
    cartPanel: {
        background: COLORS.white, borderRadius: '12px', border: `1px solid ${COLORS.border}`,
        height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    },
    cartItem: {
        display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '8px',
        marginBottom: '8px', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    },
    qtyControl: {
        display: 'inline-flex', alignItems: 'center', gap: '4px', background: COLORS.white,
        borderRadius: '20px', border: '1px solid #ddd', padding: '2px',
    },
    qtyBtn: {
        width: 26, height: 26, minWidth: 26, padding: 0, background: COLORS.primary,
        color: COLORS.white, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },

    /* ── Kitchen ── */
    kitchenCard: (color) => ({
        background: COLORS.white, borderRadius: '12px', padding: '16px',
        borderLeft: `4px solid ${color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }),
};

export default canteenStyles;
