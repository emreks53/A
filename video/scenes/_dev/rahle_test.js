import * as THREE from 'three';
let R={};
export default {
  post:{ dof:{enabled:false}, bloom:{enabled:false} },
  async setup(ctx){ const {scene,camera,MODELS:M,ENV}=ctx;
    scene.background=new THREE.Color('#8899aa'); scene.environment=await ctx.loadHDR('kiara_interior'); scene.environmentIntensity=.8;
    const sun=ENV.sunLight({pos:[3,5,4],size:2}); scene.add(sun,sun.target);
    const g=new THREE.Mesh(new THREE.PlaneGeometry(10,10).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#bbaa99'})); g.receiveShadow=true; scene.add(g);
    const r=M.rahle({length:.62,width:.28,angle:1.0}); scene.add(r); R.r=r;
    const mus=M.mushaf({w:.2,h:.27,d:.055}); const holder=new THREE.Group(); holder.position.set(0,r.userData.crossY,0); holder.rotation.x=-r.userData.openAngle; scene.add(holder);
    mus.position.set(0,.27/2+.01,.014/2+.055/2+.002); holder.add(mus);
    camera.fov=30; camera.updateProjectionMatrix();
  },
  update(t,ctx){ const c=ctx.camera; const a=t*1.2; c.position.set(Math.sin(a)*1.6,.6,Math.cos(a)*1.6); c.lookAt(0,.2,0); }
};
