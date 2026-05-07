# Nikon D7000 Webcam Setup on Ubuntu

This guide explains how to use a **Nikon D7000 DSLR camera as the default webcam in Ubuntu** using **gphoto2, ffmpeg, and v4l2loopback**.

The setup creates a **virtual webcam device** and streams the Nikon camera live view to it.

---

# Requirements

* Ubuntu (tested on Ubuntu 22+)
* Nikon D7000
* USB cable
* Installed packages:

  * gphoto2
  * ffmpeg
  * v4l2loopback
  * v4l-utils

---

# 1. Install Required Packages

Run:

```
sudo apt update
sudo apt install gphoto2 ffmpeg v4l2loopback-dkms v4l-utils
```

---

# 2. Create Webcam Script

Create the script:

```
nano ~/nikon-webcam.sh
```

Paste the following:

```
#!/bin/bash

# Stop Ubuntu camera auto mount
killall gvfs-gphoto2-volume-monitor 2>/dev/null
pkill gvfs 2>/dev/null

# Reset virtual camera
sudo modprobe -r v4l2loopback 2>/dev/null

# Create Nikon virtual camera as default (/dev/video0)
sudo modprobe v4l2loopback devices=1 video_nr=0 card_label="NikonCam" exclusive_caps=1

sleep 2

# Enable live view
gphoto2 --set-config liveview=1

sleep 1

# Stream Nikon camera
gphoto2 --stdout --capture-movie | ffmpeg -i - -vcodec rawvideo -pix_fmt yuv420p -f v4l2 /dev/video0
```

Save and exit.

---

# 3. Make Script Executable

```
chmod +x ~/nikon-webcam.sh
```

---

# 4. Start Webcam

Run:

```
./nikon-webcam.sh
```

The Nikon camera will now appear as:

```
/dev/video0
```

---

# 5. Test the Webcam

Install Cheese:

```
sudo apt install cheese
```

Run:

```
cheese
```

Camera name:

```
NikonCam
```

---

# 6. Auto Start on Login

Open startup applications:

```
gnome-session-properties
```

Add a new entry:

Name:

```
Nikon Webcam
```

Command:

```
/home/YOUR_USERNAME/nikon-webcam.sh
```

Replace `YOUR_USERNAME` with your Linux username.

---

# Nikon Camera Settings

Before running the script:

1. Turn the camera ON
2. Switch to **Movie Mode**
3. Enable **Live View**
4. Disable **Auto Power Off**

Otherwise streaming may stop automatically.

---

# Notes

* USB streaming from Nikon D7000 provides **preview quality (~640x426)**.
* For **Full HD (1080p)** use an **HDMI capture card**.

Example setup:

```
Nikon HDMI → USB Capture Card → Ubuntu
```

This method provides better quality and stability.

---

# Troubleshooting

### Device busy error

```
Could not claim the USB device
```

Run:

```
killall gvfs-gphoto2-volume-monitor
```

---

### Check camera detection

```
gphoto2 --auto-detect
```

Expected output:

```
Nikon D7000 usb:001,015
```

---

# Supported Apps

Once running, the Nikon webcam works with:

* Zoom
* Google Meet
* OBS Studio
* Microsoft Teams
* Cheese
* Any V4L2 compatible app

---

# Author

Setup guide for using Nikon DSLR as webcam on Linux using open-source tools.
