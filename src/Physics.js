import { Clock, Vector3, Quaternion, Matrix4 } from 'three';
//import RAPIER from '@dimforge/rapier3d';

export class Physics{
    static RAPIER_PATH = 'https://cdn.skypack.dev/@dimforge/rapier3d-compat@0.12.0';

    constructor(){
        this.isReady = false;
        this.meshes = [];
	    this.meshMap = new WeakMap();
    
	    this.tmpVec3 = new Vector3();
	    this.tmpQuat = new Quaternion();
	    this.tmpMat = new Matrix4();

        this.ZERO = new Vector3();

        this.clock = new Clock();
        this.fixedstep = 1/120;
    }

    async initPhysics() {

        if ( this.RAPIER == null ) {
    
            this.RAPIER = await import( Physics.RAPIER_PATH );
            await this.RAPIER.init();
    
        }
    
        // Docs: https://rapier.rs/docs/api/javascript/JavaScript3D/	
    
        this.gravity = new Vector3( 0.0, - 9.81, 0.0 );
        this.world = new this.RAPIER.World( this.gravity );
        this.snapshot = this.world.takeSnapshot();

        /*this.eventQueue = new this.RAPIER.EventQueue(true);
        
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            // Handle the collision event. 
            console.log(handle1, handle2, started);
        });
        
        this.eventQueue.drainContactForceEvents(event => {
            let handle1 = event.collider1(); // Handle of the first collider involved in the event.
            let handle2 = event.collider2(); // Handle of the second collider involved in the event.
            // Handle the contact force event. 
        });*/

        this.isReady = true;

    }

    reset(){
        this.world.bodies.free();
        this.world = new this.RAPIER.World( this.gravity );
        this.meshes = [];
        this.meshMap = new WeakMap();
    }

    setCollisionEventsActive( mesh ){
        const body = this.meshMap.get( mesh );

        const collider = body.collider(0);

        collider.setActiveCollisionTypes( this.RAPIER.ActiveCollisionTypes.DEFAULT | this.RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        collider.setActiveEvents( this.RAPIER.ActiveEvents.COLLISION_EVENTS | this.RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS )
    }

    getCollider( geometry ) {
        if (!this.isReady){
            console.warn('Physics.getCollider RAPIER not initialized');
            return;
        }

        const parameters = geometry.parameters;

        // TODO change type to is*

        if ( geometry.type === 'BoxGeometry' ) {

            const sx = parameters.width !== undefined ? parameters.width / 2 : 0.5;
            const sy = parameters.height !== undefined ? parameters.height / 2 : 0.5;
            const sz = parameters.depth !== undefined ? parameters.depth / 2 : 0.5;

            return this.RAPIER.ColliderDesc.cuboid( sx, sy, sz );

        } else if ( geometry.type === 'SphereGeometry' || geometry.type === 'IcosahedronGeometry' ) {

            const radius = parameters.radius !== undefined ? parameters.radius : 1;
            return this.RAPIER.ColliderDesc.ball( radius );

        } else if ( geometry.type === 'BufferGeometry'){

            const verticesAttr = geometry.getAttribute("position");
            const indicesAttr = geometry.getIndex();
            return this.RAPIER.ColliderDesc.trimesh( verticesAttr.array, indicesAttr.array );

        }

        return null;

    }

	addMesh( mesh, mass = 0, restitution = 0 ) {

		const shape = this.getCollider( mesh.geometry );

		if ( shape === null ) return;

		shape.setMass( mass );
		shape.setRestitution( restitution );

		const body = this.createBody( mesh.position, mesh.quaternion, mass, shape );

		if ( mass > 0 ) {

			this.meshes.push( mesh );

		}

        this.meshMap.set( mesh, body );

	}

	createBody( position, quaternion, mass, shape ) {
        if (!this.isReady){
            console.warn('Physics.createBody RAPIER not initialized');
            return;
        }

		const desc = mass > 0 ? this.RAPIER.RigidBodyDesc.dynamic() : this.RAPIER.RigidBodyDesc.fixed();
		desc.setTranslation( ...position );
		if ( quaternion !== null ) desc.setRotation( quaternion );

		const body = this.world.createRigidBody( desc );
		this.world.createCollider( shape, body );

		return body;

	}

	setMeshPosition( mesh, position  ) {
        if (position == null) position = mesh.position;

		const body = this.meshMap.get( mesh );

		body.setAngvel( this.ZERO );
		body.setLinvel( this.ZERO );
		body.setTranslation( position );

        mesh.position.copy(position);
	}

    setMeshQuaternion( mesh, quaternion  ) {
        if (quaternion == null) quaternion = mesh.quaternion;

		const body = this.meshMap.get( mesh );

		body.setAngvel( this.ZERO );
		body.setLinvel( this.ZERO );
		body.setRotation( quaternion );

        mesh.quaternion.copy(quaternion);
	}

	setMeshVelocity( mesh, velocity, index = 0 ) {

		let body = this.meshMap.get( mesh );

		if ( mesh.isInstancedMesh ) {

			body = body[ index ];

		}

		body.setLinvel( velocity );

	}

	step() {
        let dt = this.clock.getDelta();
        if (dt>(1/10)) dt = 1/10;

        let time = 0;

        this.world.timestep = this.fixedstep;

        do{
		    this.world.step();
            time += this.fixedstep;
        }while( (dt - time) > this.fixedstep );
        
        if ((dt - time) > 0){
            this.world.timestep = dt - time;
            this.world.step();
        }

		this.meshes.forEach( mesh => {

            const body = this.meshMap.get( mesh );

            mesh.position.copy( body.translation() );
            mesh.quaternion.copy( body.rotation() );

        });

	}

}

