import { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import io from "socket.io-client";
import Peer from "peerjs";

import "./App.css";

import Forms from "./components/Forms";
import RoomPage from "./pages/RoomPage";

const server = "http://localhost:5000";
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);

const myPeer = new Peer(undefined, {
  host: "localhost:5000",
  port: "3001",
});

const App = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [peers, setPeers] = useState({});
  const [openVideo, setOpenVideo] = useState(false);

  const videoGrid = useRef(null);

  const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
    videoGrid.current.append(video);
  };

  const connectToNewUser = (userId, stream) => {
    const call = myPeer.call(userId, stream);
    const video = document.createElement("video");
    video.title = users.find((user) => user.id === userId).name;
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream);
    });
    call.on("close", () => {
      video.remove();
    });

    peers[socket.id] = call;
  };

  useEffect(() => {
    if (user) {
      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          const myVideo = document.createElement("video");
          addVideoStream(myVideo, stream);

          myPeer.on("call", (call) => {
            call.answer(stream);
            const video = document.createElement("video");
            call.on("stream", (userVideoStream) => {
              addVideoStream(video, userVideoStream);
            });
          });
        });
    }
    socket.on("userIsJoined", (data) => {
      if (data.success) {
        console.log("userJoined");
        setUsers(data.users);
        connectToNewUser(socket.id, stream);
      } else {
        console.log("userJoined error");
      }
    });

    socket.on("allUsers", (data) => {
      setUsers(data);
    });

    socket.on("userJoinedMessageBroadcasted", (data) => {
      console.log(`${data} joined the room`);
      toast.info(`${data} joined the room`);
    });

    socket.on("userLeftMessageBroadcasted", (data) => {
      console.log(`${data} left the room`);
      toast.info(`${data} left the room`);
      if (peers[socket.id]) peers[socket.id].close();
    });
  }, [users]);

  const uuid = () => {
    let S4 = () => {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (
      S4() +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      S4() +
      S4()
    );
  };

  return (
    <div className="container">
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={<Forms uuid={uuid} socket={socket} setUser={setUser} />}
        />
        <Route
          path="/:roomId"
          element={
            <>
              <button
                onClick={() => setOpenVideo(!openVideo)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  zIndex: "100",
                  backgroundColor: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Open Video
              </button>
              {openVideo && (
                <div
                  className="video-grid h-100 position-fixed top-0 end-0"
                  style={{
                    zIndex: 1000,
                  }}
                  ref={videoGrid}
                ></div>
              )}
              <RoomPage user={user} socket={socket} users={users} />
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
