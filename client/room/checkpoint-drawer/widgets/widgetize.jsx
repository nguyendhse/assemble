import React, { Component } from 'react'
import { ToPeers, FromPeers, Connections } from '../../../lib/emitters'
import Sock from '../../../lib/sock'
import IconButton from '../../../common/icon-button'
import { Close } from '../../../common/icons'
import { Card, Popconfirm } from 'antd'

export default WrappedComponent => class extends Component {
  static kind = WrappedComponent.kind
  static icon = WrappedComponent.icon
  kind = WrappedComponent.kind

  constructor() {
    super()

    this.state = Object.assign({ owner: null }, WrappedComponent.initial)
  }

  isOwner = () => this.state.owner == Sock.id || this.state.owner == null
  eventPrefix = () => `widget-${this.kind}`
  ownerIsDead = mids => mids.filter(mids => mids == this.state.owner).length > 0

  mids = []
  newFriends = mids => {
    const result = mids.filter(
      m => this.props.me.id != m && !this.mids.includes(m)
    )
    this.mids = result
    return result
  }

  componentWillMount() {
    if (this.props.initialState)
      Object.assign(this.state, this.props.initialState)

    /*
       * If we're owner, share the change with everyone
       */
    FromPeers.on(this.eventPrefix(), stateChange => {
      if (this.isOwner()) this.sendToAll(stateChange)

      if (typeof stateChange == 'string' || stateChange == 'delete') {
        this.props.delete(this.kind)
      } else {
        this.setState(stateChange)
      }
    })
  }

  componentDidMount() {
    if (!this.state.owner) this.declareOwnership()
  }

  componentWillUnmount() {
    FromPeers.off(this.eventPrefix)
  }

  componentWillReceiveProps({ members }) {
    /*
       * Listen to changes in members for 2 purposes
       * 1) Check and set if the owner is dead
       * 2) See if we are the owner and need to alert new friends about the
       *    existence of this widget
       *
       *    If so, wait until we've received the `connected-to-${partnerId}`
       *    events from the corresponding webrtc components, then broadcast
       *    ourselves as owners
       */
    if (this.isOwner()) this.tellNewFriends(members)
    else this.checkOwnerDeath(members)
  }

  tellNewFriends = mids => {
    const declareIfReady = () =>
      setTimeout(() => {
        Connections.hasAllOf(toTell) && this.declareOwnership()
      }, 10)

    const toTell = new Set(this.newFriends(mids))

    if (toTell.size > 0) {
      toTell.forEach(uid => {
        declareIfReady()
        ToPeers.on(`connected-to-${uid}`, declareIfReady)
      })
    }
  }

  checkOwnerDeath = mids => {
    if (this.ownerIsDead(mids)) this.state.owner = null
  }

  declareOwnership = () => {
    this.state.owner = Sock.id
    this.sendToAll(this.state)
  }

  sendToAll = data =>
    ToPeers.emit('to-all', {
      event: this.eventPrefix(),
      data,
    })

  update = change =>
    (this.isOwner()
      ? this.updateIfBoss(change)
      : !this.state.owner
          ? this.updateIfAnarchy(change)
          : this.updateIfSlave(change))

  updateIfBoss = change => {
    this.sendToAll(change)
    this.setState(change)
  }

  updateIfSlave = change =>
    ToPeers.emit(`to-${this.state.owner}`, {
      event: this.eventPrefix(),
      data: change,
    })

  updateIfAnarchy = change =>
    this.updateIfBoss(Object.assign(change, { owner: this.props.me.id }))

  calcTransform = (pos, translate) =>
    (this.spatial
      ? `translate(${pos.x + translate.x}px, ${pos.y + translate.y}px)`
      : `translate(${pos.x}px, ${pos.y}px)`)

  suicide = () => {
    this.props.delete(this.kind)
  }

  render() {
    const { me, checkpointName } = this.props
    const { owner, ...state } = this.state

    const toPass = Object.assign(
      {
        me,
        checkpointName,
        update: this.update,
      },
      state
    )

    return (
      <Card
        className="widget-border"
        title={this.kind}
        extra={
          <Popconfirm
            title={
              <div>
                Are you sure you want to delete this widget?
                <br />
                Your data cannot be recovered
              </div>
            }
            onConfirm={this.suicide}
            okText="Delete"
            cancelText="No"
          >
            <IconButton>
              <Close />
            </IconButton>
          </Popconfirm>
        }
      >
        <WrappedComponent {...toPass} />
      </Card>
    )
  }
}
