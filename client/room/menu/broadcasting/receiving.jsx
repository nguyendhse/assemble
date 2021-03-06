import React, { Component } from 'react'
import { Button, Modal } from 'antd'
import Sock from '../../../lib/sock'
import { Bus } from '../../../lib/emitters'
import Operator from '../../operator'

export default class Broadcasting extends Component {
  state = {
    hasVideo: false
  }

  componentDidMount() {
    this.setStream()
    Operator.on('update', this.setStream)
  }

  setStream = () => {
    const broadcaster = this.props.broadcasting.id

    const otherStream = Operator.stream.getToRelay()

    if (this.preview) {
      this.preview.srcObject = otherStream
      this.preview.volume = 1

      const hasVideo = otherStream && otherStream.getVideoTracks().length > 0
      this.setState({ hasVideo })
    }
  }

  render() {
    const { broadcasting } = this.props
    const { hasVideo } = this.state

    return (
      <Modal
        title={`Broadcast from ${broadcasting.name}`}
        visible={true}
        footer={null}
        closable={false}
        maskClosable={false}
        style={{ top: 20, left: 20 }}
        width={350}
        mask={false}
        className="broadcast-container"
        wrapClassName="broadcast"
      >
        <div className="broadcast-modal">
          <video
            autoPlay
            style={{
              width: '100%',
              transform: 'rotateY(180deg)'
            }}
            ref={el => (this.preview = el)}
          />
        </div>
      </Modal>
    )
  }
}
