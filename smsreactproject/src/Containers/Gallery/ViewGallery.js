import React, { useState, useMemo } from "react";
import {
    Box,
    Card,
    CardMedia,
    Container,
    Typography,
    Button,
    Chip,
    Select,
    MenuItem,
    FormControl,
    IconButton,
    Paper,
} from "@material-ui/core";
import {
    FolderOutlined,
    ArrowBack,
    CloudUpload,
} from "@material-ui/icons";

/* ---------------- SAMPLE DATA ---------------- */
const foldersData = [
    {
        id: 1,
        name: "Vacation",
        items: [
            { url: "https://picsum.photos/400/500?1", type: "photo" },
            { url: "https://picsum.photos/400/600?2", type: "video" },
        ],
    },
    {
        id: 2,
        name: "Office",
        items: [
            { url: "https://picsum.photos/400/450?3", type: "photo" },
            { url: "https://picsum.photos/400/550?4", type: "photo" },
        ],
    },
];

const ViewGallery = () => {
    const [folders, setFolders] = useState(foldersData);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("new");
    const [openCreate, setOpenCreate] = useState(false);
    const [folderName, setFolderName] = useState("");

    /* ---------------- CREATE FOLDER ---------------- */
    const createFolder = () => {
        if (!folderName.trim()) return;

        setFolders((prev) => [
            ...prev,
            {
                id: Date.now(),
                name: folderName,
                items: [],
            },
        ]);

        setFolderName("");
        setOpenCreate(false);
    };

    /* ---------------- UPLOAD FOLDER ---------------- */
    const handleFolderUpload = (e) => {
        const files = Array.from(e.target.files);

        const items = files.map((file) => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video") ? "video" : "photo",
        }));

        setFolders((prev) => [
            ...prev,
            {
                id: Date.now(),
                name: `Uploaded Folder (${prev.length + 1})`,
                items,
            },
        ]);
    };

    /* ---------------- FILTER + SORT ---------------- */
    const filteredItems = useMemo(() => {
        if (!currentFolder) return [];

        let data =
            filter === "all"
                ? [...currentFolder.items]
                : currentFolder.items.filter((i) => i.type === filter);

        if (sort === "az") {
            data.sort((a, b) => a.url.localeCompare(b.url));
        }

        if (sort === "old") {
            data.reverse();
        }

        return data;
    }, [currentFolder, filter, sort]);

    return (
        <Paper style={{ background: "#f5f7fb", padding: 40, minHeight: "100vh" }}>
            <Container maxWidth="lg">

                {/* ================= FOLDER LIST ================= */}
                {!currentFolder && (
                    <>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={4}
                        >
                            <Typography variant="h4" style={{ fontWeight: 700 }}>
                                Gallery &gt; Folders
                            </Typography>

                            <Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    style={{ marginRight: 12, borderRadius: 24 }}
                                    onClick={() => setOpenCreate(true)}
                                >
                                    + Create Folder
                                </Button>

                                <input
                                    type="file"
                                    webkitdirectory
                                    directory
                                    multiple
                                    hidden
                                    id="upload-folder"
                                    onChange={handleFolderUpload}
                                />

                                <label htmlFor="upload-folder">
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        component="span"
                                        style={{ borderRadius: 24 }}
                                    >
                                        Upload Folder
                                    </Button>
                                </label>
                            </Box>
                        </Box>

                        <Box
                            display="grid"
                            style={{
                                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                gap: 24,
                            }}
                        >
                            {folders.map((folder) => (
                                <Card
                                    key={folder.id}
                                    onClick={() => setCurrentFolder(folder)}
                                    style={{
                                        padding: 24,
                                        borderRadius: 16,
                                        cursor: "pointer",
                                        textAlign: "center",
                                        transition: "0.2s",
                                    }}
                                >
                                    <FolderOutlined style={{ fontSize: 64, color: "#4f46e5" }} />
                                    <Typography style={{ marginTop: 12, fontWeight: 600 }}>
                                        {folder.name}
                                    </Typography>
                                </Card>
                            ))}
                        </Box>
                    </>
                )}

                {/* ================= INSIDE FOLDER ================= */}
                {currentFolder && (
                    <>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Box display="flex" alignItems="center">
                                <IconButton onClick={() => setCurrentFolder(null)}>
                                    <ArrowBack />
                                </IconButton>
                                <Typography variant="h4" style={{ fontWeight: 700 }}>
                                    {currentFolder.name}
                                </Typography>
                            </Box>

                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<CloudUpload />}
                                style={{ borderRadius: 24 }}
                            >
                                Upload Images / Videos
                            </Button>
                        </Box>

                        <Box mb={2} display="flex" alignItems="center">
                            {["all", "photo", "video"].map((item) => (
                                <Chip
                                    key={item}
                                    label={item.toUpperCase()}
                                    clickable
                                    color={filter === item ? "primary" : "default"}
                                    onClick={() => setFilter(item)}
                                    style={{ marginRight: 8 }}
                                />
                            ))}

                            <FormControl size="small" variant="outlined">
                                <Select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                >
                                    <MenuItem value="new">Newest</MenuItem>
                                    <MenuItem value="old">Oldest</MenuItem>
                                    <MenuItem value="az">A - Z</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Box style={{ columnCount: 4, columnGap: 16 }}>
                            {filteredItems.map((item, index) => (
                                <Card
                                    key={index}
                                    style={{
                                        marginBottom: 16,
                                        breakInside: "avoid",
                                        borderRadius: 16,
                                        overflow: "hidden",
                                        position: "relative",
                                    }}
                                >
                                    {item.type === "photo" ? (
                                        <CardMedia component="img" image={item.url} />
                                    ) : (
                                        <video src={item.url} controls width="100%" />
                                    )}

                                    {item.type === "video" && (
                                        <Box
                                            position="absolute"
                                            top={10}
                                            right={10}
                                            style={{
                                                background: "rgba(0,0,0,0.6)",
                                                color: "#fff",
                                                padding: "2px 8px",
                                                borderRadius: 10,
                                                fontSize: 12,
                                            }}
                                        >
                                            ▶ VIDEO
                                        </Box>
                                    )}
                                </Card>
                            ))}
                        </Box>
                    </>
                )}

                {/* ================= CREATE FOLDER MODAL ================= */}
                {openCreate && (
                    <Paper
                        style={{
                            position: "fixed",
                            top: "40%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            padding: 24,
                            zIndex: 1300,
                            width: 320,
                        }}
                    >
                        <Typography variant="h6" gutterBottom>
                            Create Folder
                        </Typography>

                        <input
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="Folder name"
                            style={{
                                width: "100%",
                                padding: 10,
                                marginBottom: 16,
                                borderRadius: 8,
                                border: "1px solid #ccc",
                            }}
                        />

                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => setOpenCreate(false)}>
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                variant="contained"
                                onClick={createFolder}
                                style={{ marginLeft: 8 }}
                            >
                                Create
                            </Button>
                        </Box>
                    </Paper>
                )}

            </Container>
        </Paper>
    );
};

export default ViewGallery;
