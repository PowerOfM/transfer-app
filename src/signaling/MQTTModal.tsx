import { useEffect, useState } from "react"
import mqttBrokers from "../assets/mqttBrokers.json"
import { Button } from "../components/Button"
import { InputForm } from "../components/InputForm"
import { Modal } from "../components/Modal"
import { MQTT_BROKER_STORAGE_KEY } from "./EncryptedMQTTClient"
import cl from "./MQTTModal.module.css"

interface IProps {
  open: boolean
  value: string
  onClose: () => void
  onChange: (value: string) => void
}

export function MQTTModal({ open, value, onClose, onChange }: IProps) {
  const [address, setAddress] = useState(value)

  useEffect(() => {
    setAddress(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = () => {
    localStorage.setItem(MQTT_BROKER_STORAGE_KEY, address)
    onChange(address)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <p>
        The MQTT server provides a way for devices to discover each other and
        connect over the internet. The servers may be public, but no sensitive
        information is sent over the connection.
      </p>

      <p className={cl.label}>MQTT Server Address:</p>
      <InputForm
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onSubmit={handleSubmit}
      />

      <p className={cl.label}>Public brokers:</p>
      <div className={cl.brokersList}>
        {mqttBrokers.map((broker) => (
          <Button small key={broker} onClick={() => setAddress(broker)}>
            {broker}
          </Button>
        ))}
      </div>
    </Modal>
  )
}
