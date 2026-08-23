import { useRef, useCallback } from 'react';

const JOYSTICK_RADIUS = 50; // rayon de la base, en px
const STICK_RADIUS = 24; // rayon du bouton mobile, en px

/**
 * Overlay de contrôles tactiles - joystick virtuel (bas-gauche) pour le
 * déplacement, deux boutons (bas-droite) pour les attaques mêlée/
 * distance. Communique avec MainScene via les méthodes publiques
 * setTouchMoveVector/requestTouchMelee/requestTouchRanged (cf.
 * MainScene.js) - jamais d'appel direct aux fonctions d'attaque, pour
 * ne jamais contourner les gardes de pause/mort du jeu.
 *
 * Affiché uniquement quand isMobile est vrai (cf. arpg.jsx, détection
 * par capacité tactile) - un appareil avec clavier n'en a pas besoin,
 * et l'overlay gênerait inutilement la vue du jeu.
 *
 * Reçoit `gameRef` (pas une scène déjà résolue) et résout
 * gameRef.current?.scene.getScene('MainScene') a l'INTERIEUR de chaque
 * gestionnaire - meme motif que le reste de arpg.jsx (handleOpenInventory
 * etc.) - une scène résolue une seule fois au rendu pourrait rester
 * `undefined` si le jeu Phaser n'est pas encore initialisé a ce moment
 * précis, sans garantie de re-rendu ulterieur pour la rattraper.
 */
export default function TouchControls({ gameRef }) {
  const joystickBaseRef = useRef(null);
  const joystickActiveTouchId = useRef(null);
  const stickElRef = useRef(null);

  const getScene = useCallback(() => gameRef.current?.scene.getScene('MainScene'), [gameRef]);

  const resetStick = useCallback(() => {
    if (stickElRef.current) {
      stickElRef.current.style.transform = 'translate(0px, 0px)';
    }
    getScene()?.setTouchMoveVector(0, 0);
  }, [getScene]);

  const updateStickFromPointer = useCallback((clientX, clientY) => {
    const base = joystickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    // clamp a l'interieur du rayon de la base - au-dela, la direction
    // reste correcte mais la magnitude plafonne a 1 (vitesse max)
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    if (stickElRef.current) {
      stickElRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    // normalise en magnitude 0-1 (pas en pixels) pour setTouchMoveVector
    getScene()?.setTouchMoveVector(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS);
  }, [getScene]);

  const handleJoystickPointerDown = (e) => {
    e.preventDefault();
    joystickActiveTouchId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e) => {
    if (joystickActiveTouchId.current !== e.pointerId) return;
    e.preventDefault();
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e) => {
    if (joystickActiveTouchId.current !== e.pointerId) return;
    joystickActiveTouchId.current = null;
    resetStick();
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
      {/* joystick de deplacement - bas-gauche */}
      <div
        ref={joystickBaseRef}
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={handleJoystickPointerUp}
        onPointerCancel={handleJoystickPointerUp}
        style={{
          position: 'absolute', left: 24, bottom: 24,
          width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2,
          borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.3)',
          touchAction: 'none', pointerEvents: 'auto',
        }}
      >
        <div
          ref={stickElRef}
          style={{
            position: 'absolute', left: '50%', top: '50%',
            width: STICK_RADIUS * 2, height: STICK_RADIUS * 2,
            marginLeft: -STICK_RADIUS, marginTop: -STICK_RADIUS,
            borderRadius: '50%', background: 'rgba(255,255,255,0.45)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* boutons d'attaque - bas-droite */}
      <button
        onPointerDown={(e) => { e.preventDefault(); getScene()?.requestTouchMelee(); }}
        style={{
          position: 'absolute', right: 100, bottom: 40,
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(200,60,60,0.5)', border: '2px solid rgba(255,255,255,0.3)',
          fontSize: 24, touchAction: 'none', pointerEvents: 'auto',
        }}
      >
        ⚔️
      </button>
      <button
        onPointerDown={(e) => { e.preventDefault(); getScene()?.requestTouchRanged(); }}
        style={{
          position: 'absolute', right: 24, bottom: 90,
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(60,120,200,0.5)', border: '2px solid rgba(255,255,255,0.3)',
          fontSize: 24, touchAction: 'none', pointerEvents: 'auto',
        }}
      >
        🏹
      </button>
    </div>
  );
}
