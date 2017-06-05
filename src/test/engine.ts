import express = require('express');
import should = require('should');
import request = require('supertest');
import { engine } from '../exec/engine';

describe('engine function', () => {
  it('should render a simple template', (done) => {
    let app = express();
    app.engine('blx', engine);
    app.set('views', './fixtures');
    app.use((req, res) => {
      res.render('one.blx');
    });

    request(app)
      .get('/')
      .expect(200, 'Hello, world.  Hope this works!')
      .end(done);
  })

  it('should render a template with variables', (done) => {
    let app = express();
    app.engine('blx', engine);
    app.set('views', './fixtures');
    app.use((req, res) => {
      res.render('two.blx', {user: 'Fred', adj: 'happy'});
    });

    request(app)
      .get('/')
      .expect(200, 'Hello, Fred.  Hope you are happy!')
      .end(done);
  })

  it('should render a template with fragments', (done) => {
    let app = express();
    app.engine('blx', engine);
    app.set('views', './fixtures');
    app.use((req, res) => {
      res.render('three.blx');
    })
    request(app)
      .get('/')
      .expect(200, '\n<p>What up, world?</p>')
      .end(done);
  })
})