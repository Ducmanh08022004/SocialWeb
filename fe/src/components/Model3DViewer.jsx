import React, { useEffect, useRef } from 'react';
import { Modal, Spin, message } from 'antd';

const Model3DViewer = ({ visible, onCancel, modelUrl, modelName }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    console.log('📦 Model3DViewer - visible:', visible, 'modelUrl:', modelUrl);
    if (!visible || !modelUrl) return;

    const initThree = async () => {
      try {
        console.log('🎬 Initializing Three.js...');
        
        // Dynamically import Three.js
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        
        console.log('✅ Three.js imported');

        if (!containerRef.current) {
          console.error('❌ Container ref not available');
          return;
        }

        console.log('📦 Container dimensions:', {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x3a3a3a);  // Dark gray background
        sceneRef.current = scene;

        // Camera setup
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        console.log('🎨 Renderer created');

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        // controls.autoRotate = true;           // Uncomment to enable auto-rotation
        // controls.autoRotateSpeed = 2;         // Adjust rotation speed (1-5)
        controlsRef.current = controls;
        
        console.log('🖱️ Controls setup');

        // Load model
        loadingRef.current = true;
        const loader = new GLTFLoader();
        
        console.log('📥 Loading model from:', modelUrl);

        loader.load(
          modelUrl,
          (gltf) => {
            console.log('✅ Model loaded successfully');
            const model = gltf.scene;
            scene.add(model);

            // Auto-fit camera to model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.5;
            camera.position.z = cameraZ;
            controls.target.copy(box.getCenter(new THREE.Vector3()));
            camera.lookAt(controls.target);

            loadingRef.current = false;
            console.log('🎥 Camera positioned');
          },
          (progress) => {
            console.log('📊 Loading progress:', Math.round((progress.loaded / progress.total) * 100) + '%');
          },
          (error) => {
            console.error('❌ Model loading error:', error);
            message.error('Failed to load 3D model: ' + error.message);
            loadingRef.current = false;
          }
        );

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          if (controls) controls.update();
          renderer.render(scene, camera);
        };
        console.log('▶️ Starting animation loop');
        animate();

        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current) return;
          const newWidth = containerRef.current.clientWidth;
          const newHeight = containerRef.current.clientHeight;
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
            containerRef.current.removeChild(renderer.domElement);
          }
          renderer.dispose();
        };
      } catch (err) {
        console.error('Three.js initialization error:', err);
        message.error('Failed to initialize 3D viewer');
      }
    };

    const cleanup = initThree();

    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(c => c && c());
      } else if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [visible, modelUrl]);

  return (
    <Modal
      title={`3D Model - ${modelName || 'Viewer'}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { padding: 0, height: '80vh' } }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {loadingRef.current && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}>
            <Spin tip="Loading 3D model..." />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default Model3DViewer;
