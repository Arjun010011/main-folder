import React, { useEffect, useState } from "react";
import "./Data.css";

const Data = ({handleValueDrop,allowDrop,droppedValue,setDroppedValue,isDragging, setIsDragging}) => {
  const tempdata=localStorage.getItem('data')
  const data=tempdata ? JSON.parse(tempdata) : null

  // Reset dragging state on mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!data) {
    return (
      <div id="datdiv" style={styles.container}>
        <h2>JSON Data</h2>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>No data loaded. Please load sample data from the toolbar.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="datdiv" style={styles.container} onMouseUp={handleMouseUp}>
      <h2>JSON Data</h2>
        <div className="nestedDiv" style={styles.scrollable}>
          <NestedDropdown data={data} isDragging={isDragging} setIsDragging={setIsDragging} />
        </div>

      {/* Drop Zone */}
      <div className="dropHere" style={styles.dropZone} onDrop={handleValueDrop} onDragOver={allowDrop}>
        <p>Drop Here:</p>
        <pre style={styles.droppedText}>
          {typeof droppedValue === "object" ? JSON.stringify(droppedValue, null, 2) : droppedValue}
        </pre>
      </div>

    </div>
  );
};

const NestedDropdown = ({ data, isDragging, setIsDragging }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Handle Drag Start (for both objects & primitives)
  const handleDragStart = (event, value) => {
    if (!isDragging) {
      const dataToSend = typeof value === "object" && value !== null
        ? JSON.stringify(value) // Convert objects to JSON
        : value; // Send primitives as-is
      
      event.dataTransfer.setData("text/plain", dataToSend);
      setIsDragging(true);
      const match = dataToSend.match(/"trust_name":\s*"(\w+)"/);
      console.log("Dragged:", match);
    }
  };

  // Handle Drag End (Reset isDragging)
  const handleDragEnd = () => {
    setTimeout(() => setIsDragging(false), 100);
  };

  if (typeof data === "object" && data !== null) {
    return (
      <div>
  <button onClick={() => setIsOpen(!isOpen)} style={styles.button}>
    {isOpen ? "▼" : "▶"}
  </button>
  {isOpen && (
    <ul style={styles.list}>
      {Object.entries(data).map(([key, value]) => (
        <li key={key} style={styles.listItem}>
          <strong>{key}:</strong>{" "}
          {typeof value === "object" && value !== null ? (
            <>
              <span
                draggable="true"
                onDragStart={(event) => handleDragStart(event, JSON.stringify(value))}
                onDragEnd={handleDragEnd}
                style={{ cursor: "grab", color: "green" }}
              >
                [object]
              </span>
              <NestedDropdown data={value} isDragging={isDragging} setIsDragging={setIsDragging} />
            </>
          ) : (
            <span
              draggable="true"
              onDragStart={(event) => handleDragStart(event, value?.toString())}
              onDragEnd={handleDragEnd}
              style={{ cursor: "grab", color: "blue" }}
            >
              {typeof value === "object" ? JSON.stringify(value) : value} {/* ✅ Ensure value is a valid child */}
            </span>
          )}
        </li>
      ))}
    </ul>
  )}
</div>

    );
  } else {
    return (
      <span
        draggable="true"
        onDragStart={(event) => handleDragStart(event, data)}
        onDragEnd={handleDragEnd}
        style={{ cursor: "grab", color: "blue" }}
      >
        {data}
      </span>
    );
  }
};

const styles = {
  container: {
    position: "fixed",
    top: "10px",
    left: "10px",
    width: "300px",
  },
  scrollable: {
    maxHeight: "400px",
    overflowY: "auto",
    border: "1px solid #ccc",
    padding: "10px",
    backgroundColor: "#f9f9f9",
  },
  button: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    marginRight: "5px",
  },
  list: {
    paddingLeft: "20px",
  },
  listItem: {
    cursor: "grab",
    padding: "5px",
    borderBottom: "1px solid #ddd",
  },
  dropZone: {
    marginTop: "20px",
    padding: "20px",
    border: "2px dashed #007bff",
    textAlign: "center",
    backgroundColor: "#f0f8ff",
  },
  droppedText: {
    fontWeight: "bold",
    color: "#007bff",
    marginTop: "10px",
  },
};

export default Data;
