'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Express = require('express')
const sget = require('simple-get').concat

const expressPlugin = require('../index')

test('Register express application inside a plugin', t => {
  t.plan(5)
  const fastify = Fastify()
  t.teardown(fastify.close)

  fastify.register(expressPlugin).after(function () {
    fastify.register(function (instance, opts, done) {
      const express = Express()
      express.use(function (req, res, next) {
        res.setHeader('x-custom', true)
        next()
      })

      express.get('/hello', (req, res) => {
        res.status(201)
        res.json({ hello: 'world' })
      })
      instance.use(express)
      done()
    })
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    sget({
      method: 'GET',
      url: address + '/hello'
    }, (err, res, data) => {
      t.error(err)
      t.equal(res.statusCode, 201)
      t.match(res.headers, { 'x-custom': 'true' })
      t.same(JSON.parse(data), { hello: 'world' })
    })
  })
})

test('Register express application that uses Router inside a plugin', t => {
  t.plan(9)
  const fastify = Fastify()
  t.teardown(fastify.close)

  fastify.register(expressPlugin).after(function () {
    fastify.register(function (instance, opts, done) {
      const router = Express.Router()

      router.use(function (req, res, next) {
        res.setHeader('x-custom', true)
        next()
      })

      router.get('/hello', (req, res) => {
        res.status(201)
        res.json({ hello: 'world' })
      })

      router.get('/foo', (req, res) => {
        res.status(400)
        res.json({ foo: 'bar' })
      })
      instance.use(router)
      done()
    })
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    sget({
      method: 'GET',
      url: address + '/hello'
    }, (err, res, data) => {
      t.error(err)
      t.equal(res.statusCode, 201)
      t.match(res.headers, { 'x-custom': 'true' })
      t.same(JSON.parse(data), { hello: 'world' })
    })
    sget({
      method: 'GET',
      url: address + '/foo'
    }, (err, res, data) => {
      t.error(err)
      t.equal(res.statusCode, 400)
      t.match(res.headers, { 'x-custom': 'true' })
      t.same(JSON.parse(data), { foo: 'bar' })
    })
  })
})

test('Should remove x-powered-by header inside a plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close)

  fastify
    .register(expressPlugin)
    .after(function () {
      fastify.register(function (instance, opts, done) {
        const router = Express.Router()

        router.get('/', (req, res) => {
          res.status(201)
          res.json({ hello: 'world' })
        })
        instance.use(router)
        done()
      })
    })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    sget({
      method: 'GET',
      url: address
    }, (err, res) => {
      t.error(err)
      t.equal(res.headers['x-powered-by'], undefined)
    })
  })
})

test('Should not expose the express app on the root fastify instance when registered inside a plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close)

  fastify.register(async function (instance) {
    await instance
      .register(expressPlugin)

    const router = Express.Router()

    router.get('/', (req, res) => {
      res.status(201)
      res.json({ hello: 'world' })
    })
    instance.use(router)
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    sget({
      method: 'GET',
      url: address
    }, (err, res) => {
      t.error(err)
      t.equal(fastify.express, undefined)
    })
  })
})

test('Should flush headers if express handles request inside a plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close)

  fastify
    .register(expressPlugin)
    .after(function () {
      fastify.register(async function (instance) {
        instance.addHook('onRequest', (_, reply, done) => {
          reply.header('foo', 'bar')

          done()
        })

        const router = Express.Router()

        router.get('/', (req, res) => {
          res.status(201)
          res.json({ hello: 'world' })
        })
        instance.use(router)
      })
    })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    sget({
      method: 'GET',
      url: address
    }, (err, res) => {
      t.error(err)
      t.equal(res.headers.foo, 'bar')
    })
  })
})
