const { body, validationResult } = require('express-validator');
/*
  ztncui - ZeroTier network controller UI
  Copyright (C) 2017-2021  Key Networks (https://key-networks.com)
  Licensed under GPLv3 - see LICENSE for details.
*/

const fs = require('fs');
const ipaddr = require('ip-address');
function validCIDR(value, family) {
  if (typeof value !== 'string' || value.length > 128) return false;
  const parts = value.split('/');
  if (parts.length !== 2 || !/^(0|[1-9][0-9]*)$/.test(parts[1])) return false;
  const bits = Number(parts[1]);
  return (ipaddr.Address4.isValid(parts[0]) && bits <= 32) ||
    (family !== 4 && ipaddr.Address6.isValid(parts[0]) && bits <= 128);
}
const storage = require('node-persist');
const zt = require('./zt');
const util = require('util');

storage.initSync({dir: 'etc/storage'});

async function get_network_with_members(nwid) {
  const [network, peers, members] = await Promise.all([
    zt.network_detail(nwid),
    zt.peers(),
    zt.members(nwid)
      .then(member_ids => {
        // Fix weird data returned by ZeroTier 1.12
        if (Array.isArray(member_ids)) {
          let obj = {};
          for (let id of member_ids) {
            let key = Object.keys(id)[0];
            let value = Object.values(id)[0];
            obj[key] = value;
          }
          member_ids = obj;
        }

        return Promise.all(
          Object.keys(member_ids)
            .map(id => Promise.all([
              zt.member_detail(nwid, id),
              storage.getItem(id)
            ]))
        );
      }).then(results => results.map(([member, name]) => {
        member.name = name || '';
        return member;
      }))
  ]);
  for (const member of members) {
    member.peer = peers.find(x => x.address === member.address);
  }
  return {network, members};
}

async function get_network_member(nwid, memberid) {
  const [network, member, peer, name] = await Promise.all([
    zt.network_detail(nwid),
    zt.member_detail(nwid, memberid),
    zt.peer(memberid),
    storage.getItem(memberid)
  ]);
  member.name = name || '';
  member.peer = peer;
  return {network, member};
}

// ZT network controller home page
exports.index = async function(req, res) {
  const navigate =
    {
      active: 'controller_home',
    }

  try {
    const zt_status = await zt.get_zt_status();
    res.render('index', {title: 'ztncui', navigate: navigate, zt_status});
  } catch (err) {
    res.render('index', {title: 'ztncui',
                      navigate: navigate, error: 'ERROR getting ZT status: ' + err});
  }
};

// Display list of all networks on this ZT network controller
exports.network_list = async function(req, res) {
  const navigate =
    {
      active: 'networks',
    }

  try {
    networks = await zt.network_list();
    res.render('networks', {title: 'Networks on this controller', navigate: navigate, networks: networks});
  } catch (err) {
    res.render('networks', {title: 'Networks on this controller', navigate: navigate, error: 'Error retrieving list of networks on this controller: ' + err});
  }
};

// Display detail page for specific network
exports.network_detail = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/networks'
    }

  try {
    const [
      {network, members},
      zt_address
    ] = await Promise.all([
      get_network_with_members(req.params.nwid),
      zt.get_zt_address()
    ]);
    res.render('network_detail', {title: 'Network ' + network.name, navigate: navigate, network: network, members: members, zt_address: zt_address});
  } catch (err) {
    res.render('network_detail', {title: 'Detail for network', navigate: navigate, error: 'Error resolving detail for network ' + req.params.nwid + ': ' + err});
  }
};

// Display Network create form on GET
exports.network_create_get = function(req, res) {
  const navigate =
    {
      active: 'add_network',
    }

  res.render('network_create', {title: 'Create network', navigate: navigate});
};

// Handle Network create on POST
exports.network_create_post = async function(req, res) {
  const navigate =
    {
      active: 'add_network',
    }

  await body('name', 'Network name required').notEmpty().run(req);

  await body('name').escape().run(req);
  await body('name').trim().run(req);

  const errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

  let name = { name: req.body.name };

  if (errors) {
    res.render('network_create', {title: 'Create Network', navigate: navigate, name: name, errors: errors});
    return;
  } else {
    try {
      const network = await zt.network_create(name);
      res.redirect('/controller/network/' + network.nwid);
    } catch (err) {
      res.render('network_detail', {title: 'Create Network - error', navigate: navigate, error: 'Error creating network ' + name.name});
    }
  }
};

// Display Network delete form on GET
exports.network_delete_get = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/networks'
    }

  try {
    const network = await zt.network_detail(req.params.nwid);
    res.render('network_delete', {title: 'Delete network', navigate: navigate,
                                    nwid: req.params.nwid, network: network});
  } catch (err) {
    res.render('network_delete', {title: 'Delete network', navigate: navigate, error: 'Error resolving network ' + req.params.nwid + ': ' + err});
  }
};

// Handle Network delete on POST
exports.network_delete_post = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/networks'
    }

  try {
    const network = await zt.network_delete(req.params.nwid);
    res.render('network_delete', {title: 'Delete network', navigate: navigate, network: network});
  } catch (err) {
    res.render('network_delete', {title: 'Delete network', navigate: navigate, error: 'Error deleting network ' + req.params.nwid + ': ' + err});
  }
};

// Network object GET
exports.network_object = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  try {
    const network = await zt.network_detail(req.params.nwid);
    navigate.whence = '/controller/network/' + network.nwid;
    res.render(req.params.object, {title: req.params.object, navigate: navigate, network: network}, function(err, html) {
      if (err) {
        if (err.message.indexOf('Failed to lookup view') !== -1 ) {
          return res.render('not_implemented', {title: req.params.object, navigate: navigate, network: network});
        }
        throw err;
      }
      res.send(html);
    });
  } catch (err) {
    res.render(req.params.object, {title: req.params.object, navigate: navigate, error: 'Error resolving detail for network ' + req.params.nwid + ': ' + err});
  }
}

// Handle Network rename form on POST
exports.name = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/networks'
    }

  await body('name', 'Network name required').notEmpty().run(req);
  await body('name').escape().run(req);
  await body('name').trim().run(req);

  const errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

  let name = { name: req.body.name };

  if (errors) {
    console.error("network name validation errors", errors);
  } else {
    try {
      const network = await zt.network_object(req.params.nwid, name);
    } catch ( err) {
      console.error("Error renaming network " + req.params.nwid, err);
    }
  }
  res.redirect('/controller/network/' + req.params.nwid);
};

// ipAssignmentPools POST
exports.ipAssignmentPools = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  await body('ipRangeStart', 'IP range start required').notEmpty().run(req);
  await body('ipRangeStart', 'IP range start needs a valid IPv4 or IPv6 address').isIP().run(req);
  await body('ipRangeStart').escape().run(req);
  await body('ipRangeStart').trim().run(req);
  await body('ipRangeEnd', 'IP range end required').notEmpty().run(req);
  await body('ipRangeEnd', 'IP range end needs a valid IPv4 or IPv6 address').isIP().run(req);
  await body('ipRangeEnd').escape().run(req);
  await body('ipRangeEnd').trim().run(req);

  const errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

  const ipAssignmentPool =
    {
      ipRangeStart: req.body.ipRangeStart,
      ipRangeEnd: req.body.ipRangeEnd
    };

  if (errors) {
    try {
      const network = await zt.network_detail(req.params.nwid);
      navigate.whence = '/controller/network/' + network.nwid;
      res.render('ipAssignmentPools', {title: 'ipAssignmentPools', navigate: navigate, ipAssignmentPool: ipAssignmentPool, network: network, errors: errors});
    } catch (err) {
      res.render('ipAssignmentPools', {title: 'ipAssignmentPools', navigate: navigate, error: 'Error resolving network detail for network ' + req.params.nwid + ': ' + err});
    }
  } else {
    try {
      const network = await zt.ipAssignmentPools(req.params.nwid, ipAssignmentPool, 'add');
      navigate.whence = '/controller/network/' + network.nwid;
      res.render('ipAssignmentPools', {title: 'ipAssignmentPools', navigate: navigate, ipAssignmentPool: ipAssignmentPool, network: network});
    } catch (err) {
      res.render('ipAssignmentPools', {title: 'ipAssignmentPools', navigate: navigate, error: 'Error applying IP Assignment Pools for network ' + req.params.nwid + ': ' + err});
    }
  }
}

isValidPrefix = function(str, max) {
  const num = Math.floor(Number(str));
  return String(num) == str && num >= 0 && num <= max;
}

// routes POST
exports.routes = async function (req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  await body('target', 'Target network is required').notEmpty().run(req);
  await body('target').trim().run(req);
  await body('target', 'Target network must be valid CIDR format')
    .custom(value => {
      return validCIDR(value);
    }).run(req);
  await body('via', 'Gateway must be a valid IPv4 or IPv6 address').optional({ values: 'falsy' }).isIP().run(req);
  await body('via').escape().run(req);
  await body('via').trim().run(req);
  if (! req.body.via) {
    req.body.via = null;
  }

  const errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

  const route =
    {
      target: req.body.target,
      via: req.body.via
    };

  if (errors) {
    try {
      const network = await zt.network_detail(req.params.nwid);
      navigate.whence = '/controller/network/' + network.nwid;
      res.render('routes', {title: 'routes', navigate: navigate, route: route, network: network, errors: errors});
    } catch (err) {
      res.render('routes', {title: 'routes', navigate: navigate, error: 'Error resolving network detail'});
    }
  } else {
    try {
      const network = await zt.routes(req.params.nwid, route, 'add');
      navigate.whence = '/controller/network/' + network.nwid;
      res.render('routes', {title: 'routes', navigate: navigate, route: route, network: network});
    } catch (err) {
      res.render('routes', {title: 'routes', navigate: navigate, error: 'Error adding route for network ' + req.params.nwid + ': ' + err});
    }
  }

}

// route_delete GET
exports.route_delete = async function (req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  const route =
    {
      target: req.params.target_ip + '/' + req.params.target_prefix,
      via: null
    };


  try {
    const network = await zt.routes(req.params.nwid, route, 'delete');
    navigate.whence = '/controller/network/' + network.nwid;
    res.render('routes', {title: 'routes', navigate: navigate, route: route, network: network});
  } catch (err) {
    res.render('routes', {title: 'routes', navigate: navigate, error: 'Error deleting route for network ' + req.params.nwid + ': ' + err});
  }
}

// ipAssignmentPool_delete GET
exports.ipAssignmentPool_delete = async function (req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  const ipAssignmentPool =
    {
      ipRangeStart: req.params.ipRangeStart,
      ipRangeEnd: req.params.ipRangeEnd
    };


  try {
    const network = await zt.ipAssignmentPools(req.params.nwid, ipAssignmentPool, 'delete');
    navigate.whence = '/controller/network/' + network.nwid;
    res.render('ipAssignmentPools', {title: 'ipAssignmentPools', navigate: navigate, ipAssignmentPool: ipAssignmentPool, network: network});
  } catch (err) {
    res.render('ipAssignmentPools', {title: 'ipAssignmentPools', navigate: navigate, error: 'Error deleting IP Assignment Pool for network ' + req.params.nwid + ': ' + err});
  }
}

// private POST
exports.private = async function (req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  const private =
    {
      private: req.body.private
    };

  try {
    const network = await zt.network_object(req.params.nwid, private);
    navigate.whence = '/controller/network/' + network.nwid;
    res.render('private', {title: 'private', navigate: navigate, network: network});
  } catch (err) {
    res.render('private', {title: 'private', navigate: navigate, error: 'Error applying private for network ' + req.params.nwid + ': ' + err});
  }
}

// v4AssignMode POST
exports.v4AssignMode = async function (req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  const v4AssignMode =
    {
      v4AssignMode: { zt: req.body.zt }
    };

  try {
    const network = await zt.network_object(req.params.nwid, v4AssignMode);
    navigate.whence = '/controller/network/' + network.nwid;
    res.render('v4AssignMode', {title: 'v4AssignMode', navigate: navigate, network: network});
  } catch (err) {
    res.render('v4AssignMode', {title: 'v4AssignMode', navigate: navigate, error: 'Error applying v4AssignMode for network ' + req.params.nwid + ': ' + err});
  }
}

// v6AssignMode POST
exports.v6AssignMode = async function (req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  const v6AssignMode =
    {
      v6AssignMode:
        {
          '6plane': req.body['6plane'],
          'rfc4193': req.body.rfc4193,
          'zt': req.body.zt
        }
    };

  try {
    const network = await zt.network_object(req.params.nwid, v6AssignMode);
    navigate.whence = '/controller/network/' + network.nwid;
    res.render('v6AssignMode', {title: 'v6AssignMode', navigate: navigate, network: network});
  } catch (err) {
    res.render('v6AssignMode', {title: 'v6AssignMode', navigate: navigate, error: 'Error applying v6AssignMode for network ' + req.params.nwid + ': ' + err});
  }
}

// dns POST
exports.dns = async function (req, res) {
  const navigate = {
    active: 'networks',
    whence: ''
  };

  const dns = {
    dns: {
      domain: req.body.domain,
      servers: req.body.servers
        .split('\n')
        .map(x => x.trim())
        .filter(ip =>
          ipaddr.Address4.isValid(ip) ||
          ipaddr.Address6.isValid(ip)
        )
    }
  };

  try {
    const network = await zt.network_object(req.params.nwid, dns);
    navigate.whence = '/controller/network/' + network.nwid;
    res.render('dns', {title: 'dns', navigate: navigate, network: network});
  } catch (err) {
    res.render('dns', {title: 'dns', navigate: navigate, error: 'Error updating dns for network ' + req.params.nwid + ': ' + err});
  }
}

// Display detail page for specific member
exports.member_detail = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  try {
    const {network, member} = await get_network_member(req.params.nwid, req.params.id);
    navigate.whence = '/controller/network/' + network.nwid + '#members';
    res.render('member_detail', {title: 'Network member detail', navigate: navigate, network: network, member: member});
  } catch (err) {
    console.error(err);
    res.render('error', {title: req.params.object, navigate: navigate, error: 'Error resolving detail for member ' + req.params.id + ' of network ' + req.params.nwid + ': ' + err});
  }
};

// Member object GET
exports.member_object = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  try {
    const {network, member} = await get_network_member(req.params.nwid, req.params.id);
    navigate.whence = '/controller/network/' + network.nwid + '#members';
    res.render(req.params.object, {title: req.params.object, navigate: navigate, network: network, member: member}, function(err, html) {
      if (err) {
        if (err.message.indexOf('Failed to lookup view') !== -1 ) {
          return res.render('not_implemented', {title: req.params.object, navigate: navigate, network: network, member: member});
        }
        throw err;
      }
      res.send(html);
    });
  } catch (err) {
    res.render(req.params.object, {title: req.params.object, navigate: navigate, error: 'Error resolving detail for member ' + req.params.id + ' of network ' + req.params.nwid + ': ' + err});
  }
}

// Easy network setup GET
exports.easy_get = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/network/' + req.params.nwid
    }

  try {
    const network = await zt.network_detail(req.params.nwid);
    res.render('network_easy', {title: 'Easy setup of network', navigate: navigate, network: network});
  } catch (err) {
    res.render('network_easy', {title: 'Easy setup of network', navigate: navigate, error: 'Error resolving detail for network ' + req.params.nwid + ': ' + err});
  }
}

// Easy network setup POST
exports.easy_post = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/networks'
    }

  await body('networkCIDR', 'Network address is required').notEmpty().run(req);
  await body('networkCIDR').trim().run(req);
  await body('networkCIDR', 'Network address must be in CIDR notation')
    .custom(value => {
      return validCIDR(value, 4);
    }).run(req);
  await body('poolStart', 'Start of IP assignment pool is required')
    .notEmpty().run(req);
  await body('poolStart', 'Start of IP assignment pool must be valid IPv4 address')
    .isIP(4).run(req);
  await body('poolStart').escape().run(req);
  await body('poolStart').trim().run(req);
  await body('poolEnd', 'End of IP assignment pool is required')
    .notEmpty().run(req);
  await body('poolEnd', 'End of IP assignment pool must be valid IPv4 address')
    .isIP(4).run(req);
  await body('poolEnd').escape().run(req);
  await body('poolEnd').trim().run(req);

  const errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

  const ipAssignmentPools =
    [{
      ipRangeStart: req.body.poolStart,
      ipRangeEnd: req.body.poolEnd
    }];

  const routes =
    [{
      target: req.body.networkCIDR,
      via: null
    }];

  const v4AssignMode =
    {
      zt: true
    };

  if (errors) {
    network =
      {
        ipAssignmentPools: ipAssignmentPools,
        routes: routes,
        v4AssignMode: v4AssignMode
      };

    res.render('network_easy', {title: 'Easy setup of network', navigate: navigate, network: network, errors: errors});
  } else {
    try {
      const network = await zt.network_easy_setup(req.params.nwid,
                                                  routes,
                                                  ipAssignmentPools,
                                                  v4AssignMode);
      res.render('network_easy', {title: 'Easy setup of network', navigate: navigate, network: network, message: 'Network setup succeeded'});
    } catch (err) {
      res.render('network_easy', {title: 'Easy setup of network', navigate: navigate, error: 'Error resolving detail for network ' + req.params.nwid + ': ' + err});
    }
  }
}

// Easy members auth POST
exports.members = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: '/controller/networks'
    }

  let errors = null;

  if (req.method === 'POST') {

    await body('id', 'Member ID is required').notEmpty().run(req);
    await body('id').trim().run(req);
    await body('id').escape().run(req);

    if (req.body.auth) {
      await body('auth', 'Authorization state must be boolean').isBoolean().run(req);
      await body('auth').trim().run(req);
      await body('auth').escape().run(req);

      errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

      if (!errors) {
        const auth =
          {
            authorized: req.body.auth
          };

        try {
          const mem = await zt.member_object(req.params.nwid, req.body.id, auth);
        } catch (err) {
          throw err;
        }
      }
    } else if (req.body.activeBridge) {
      await body('activeBridge', 'activeBridge state must be boolean').isBoolean().run(req);
      await body('activeBridge').trim().run(req);
      await body('activeBridge').escape().run(req);

      errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

      if (!errors) {
        const activeBridge =
          {
            activeBridge: req.body.activeBridge
          };

        try {
          const mem = await zt.member_object(req.params.nwid, req.body.id, activeBridge);
        } catch (err) {
          throw err;
        }
      }
    } else if (req.body.name) {
      await body('name').trim().run(req);
      await body('name').escape().run(req);

      errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

      if (!errors) {
        try {
          const ret = await storage.setItem(req.body.id, req.body.name);
        } catch (err) {
          throw err;
        }
      }
    }
  } else { // GET
    res.redirect("/controller/network/" + req.params.nwid + "#members");
  }
  if (req.method === 'POST') {
    if (errors) return res.status(400).json({ error: 'Invalid member update' });
    return res.status(204).end();
  }
}

// Member delete GET or POST
exports.member_delete = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  try {
    const network = await zt.network_detail(req.params.nwid);
    let member = null;
    let name = null;
    if (req.method === 'POST') {
      member = await zt.member_delete(req.params.nwid, req.params.id);
      if (member.deleted) {
        name = await storage.removeItem(member.id);
      }
    } else {
      member = await zt.member_detail(req.params.nwid, req.params.id);
      name = await storage.getItem(member.id);
    }
    member.name = name || '';

    navigate.whence = '/controller/network/' + network.nwid;
    res.render('member_delete', {title: 'Delete member from ' + network.name,
                                  navigate: navigate, network: network, member: member});
  } catch (err) {
    res.render('member_delete', {title: 'Delete member from network', navigate: navigate,
                    error: 'Error resolving detail for member ' + req.params.id
                              + ' of network ' + req.params.nwid + ': ' + err});
  }
}

// ipAssignment delete GET
exports.delete_ip = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  try {
    const network = await zt.network_detail(req.params.nwid);
    let member = await zt.member_detail(req.params.nwid, req.params.id);
    navigate.whence = '/controller/network/' + network.nwid;
    member.name = await storage.getItem(member.id) || '';
    if (req.params.index) {
      member = await zt.ipAssignmentDelete(network.nwid, member.id,
                                                              req.params.index);
      return res.redirect('/controller/network/' + network.nwid + '/member/' +
                                                  member.id + '/ipAssignments');
    }
    res.render('ipAssignments', {title: 'ipAssignments ' + network.name,
          navigate: navigate, index: req.params.index, network: network, member: member});
  } catch (err) {
    res.render('ipAssignments', {title: 'ipAssignments', navigate: navigate,
                    error: 'Error resolving detail for member ' + req.params.id
                              + ' of network ' + req.params.nwid + ': ' + err});
  }
}

// ipAssignments POST
exports.assign_ip = async function(req, res) {
  const navigate =
    {
      active: 'networks',
      whence: ''
    }

  try {
    var network = await zt.network_detail(req.params.nwid);
  } catch (err) {
    throw err;
  }

  await body('ipAddress', 'IP address required').notEmpty().run(req);
  await body('ipAddress', 'IP address must be a valid IPv4 or IPv6 address').isIP().run(req);
  await body('ipAddress', 'IP address must fall within a managed route')
    .custom(value => {
      return network.routes.some(item => {
        for (const Address of [ipaddr.Address4, ipaddr.Address6]) {
          if (Address.isValid(value) && Address.isValid(item.target)) {
            if (new Address(value).isInSubnet(new Address(item.target))) return true;
          }
        }
        return false;
      });
    }).run(req);
  await body('ipAddress').escape().run(req);
  await body('ipAddress').trim().run(req);

  const errors = (validationResult(req).isEmpty() ? false : validationResult(req).array());

  const ipAssignment = { ipAddress: req.body.ipAddress };

  try {
    let member = await zt.member_detail(req.params.nwid, req.params.id);
    navigate.whence = '/controller/network/' + network.nwid;

    if (!errors) {
      member = await zt.ipAssignmentAdd(network.nwid, member.id, ipAssignment);
    }

    member.name = await storage.getItem(member.id) || '';

    res.render('ipAssignments', {title: 'ipAssignments', navigate: navigate,
                  ipAssignment: ipAssignment, network: network, member: member,
                                                               errors: errors});
  } catch (err) {
    res.render('ipAssignments', {title: 'ipAssignments', navigate: navigate,
                    error: 'Error resolving detail for member ' + req.params.id
                              + ' of network ' + req.params.nwid + ': ' + err});
  }
}
