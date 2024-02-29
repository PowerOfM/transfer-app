import { useEffect, useState, useRef } from 'react'
import './App.css'
import mqtt from 'mqtt'
import { getUserIP } from './getUserIP'

const id = crypto.randomUUID()
let num = 0;

function App() {
  const clientRef = useRef()
  const [msgs, setMsgs] = useState([])

  const addMsg = msg => setMsgs(prev => {
    const next = [...prev]
    if (next.length > 200) next.shift()
    next.push(msg)
    return next
  })

  useEffect(() => {
    getUserIP().then(ip => console.log('My IP is', ip))
    console.log('start')
    const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt")
    clientRef.current = client

    client.on("connect", () => {
      console.log('Connect!')
      client.subscribe("presence", (err, msg) => {
        console.log('subscribe', err, msg)
        if (err) {
          console.error('Subscribe error', err)
          addMsg("Error: " + err.toString())
          return
        }

        addMsg("Connected to presence")
      });
      client.publish("presence", id + " - Hello - " + ++num);
    });

    client.on("message", (topic, message) => {
      addMsg("[MSG] " + topic + ": " + message.toString())
    });
  }, [])

  return (
    <>
      {msgs.map((str, i) => <p key={i}>{str}</p>)}
    </>
  )
}

export default App
