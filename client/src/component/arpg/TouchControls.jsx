import { useRef, useCallback } from "react";

const JOYSTICK_RADIUS = 50; // rayon de la base, en px
const STICK_RADIUS = 24; // rayon du bouton mobile, en px

/**
 * Overlay de contrôles tactiles - joystick virtuel (bas-gauche) pour le
 * déplacement, boutons (bas-droite) pour les attaques mêlée/distance,
 * l'action (E clavier) et la furie (X clavier). Communique avec
 * MainScene via les méthodes publiques setTouchMoveVector/
 * requestTouchMelee/requestTouchRanged/requestTouchAction/
 * requestTouchFury (cf. MainScene.js) - jamais d'appel direct aux
 * fonctions d'attaque, pour ne jamais contourner les gardes de pause/
 * mort du jeu.
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
 *
 * Positions (bottom/right) resserrees pour un vrai ecran de telephone
 * en paysage - la hauteur reellement disponible pour le jeu (barre
 * d'adresse + HUD deja retires) est bien plus courte qu'un ecran
 * desktop ; des decalages trop genereux poussaient les boutons vers le
 * centre de l'ecran au lieu de coller au bord bas.
 */
export default function TouchControls({ gameRef, furyReady }) {
  const joystickBaseRef = useRef(null);
  const joystickActiveTouchId = useRef(null);
  const stickElRef = useRef(null);

  const getScene = useCallback(
    () => gameRef.current?.scene.getScene("MainScene"),
    [gameRef],
  );

  const resetStick = useCallback(() => {
    if (stickElRef.current) {
      stickElRef.current.style.transform = "translate(0px, 0px)";
    }
    getScene()?.setTouchMoveVector(0, 0);
  }, [getScene]);

  const updateStickFromPointer = useCallback(
    (clientX, clientY) => {
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
      getScene()?.setTouchMoveVector(
        dx / JOYSTICK_RADIUS,
        dy / JOYSTICK_RADIUS,
      );
    },
    [getScene],
  );

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
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      {/* joystick de deplacement - bas-gauche */}
      <div
        ref={joystickBaseRef}
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={handleJoystickPointerUp}
        onPointerCancel={handleJoystickPointerUp}
        style={{
          position: "absolute",
          left: 24,
          bottom: 24,
          width: JOYSTICK_RADIUS * 2,
          height: JOYSTICK_RADIUS * 2,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "2px solid rgba(255,255,255,0.3)",
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        <div
          ref={stickElRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: STICK_RADIUS * 2,
            height: STICK_RADIUS * 2,
            marginLeft: -STICK_RADIUS,
            marginTop: -STICK_RADIUS,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.45)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* melee - bas-droite */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getScene()?.requestTouchMelee();
        }}
        style={{
          position: "absolute",
          right: 110,
          bottom: 50,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(200,60,60,0.5)",
          border: "2px solid rgba(255,255,255,0.3)",
          fontSize: 24,
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        ⚔️
      </button>

      {/* distance */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getScene()?.requestTouchRanged();
        }}
        style={{
          position: "absolute",
          right: 60,
          bottom: 100,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(60,120,200,0.5)",
          border: "2px solid rgba(255,255,255,0.3)",
          fontSize: 24,
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        🏹
      </button>

      {/* action (E clavier) - interagir avec coffres/PNJ/hub/boutique/porte
          du boss, jamais de degats (cf. MainScene.performInteraction) -
          necessaire depuis que E/Espace sont deux touches distinctes :
          sans ce bouton, ces interactions deviendraient inatteignables
          au toucher */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getScene()?.requestTouchAction();
        }}
        style={{
          position: "absolute",
          right: 110,
          bottom: 150,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(80,180,120,0.5)",
          border: "2px solid rgba(255,255,255,0.3)",
          fontSize: 22,
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        ✋
      </button>

      {/* furie (X clavier) - grise/inactif tant que furyReady est faux
          (cf. MainScene.furyKillCount / FURY_KILLS_REQUIRED, suivi via
          l'evenement 'fury-progress' cote React, cf. arpg.jsx) */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          if (!furyReady) return;
          getScene()?.requestTouchFury();
        }}
        style={{
          position: "absolute",
          right: 170,
          bottom: 100,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: furyReady
            ? "rgba(255,60,20,0.6)"
            : "rgba(100,100,100,0.3)",
          border: "2px solid rgba(255,255,255,0.3)",
          fontSize: 22,
          opacity: furyReady ? 1 : 0.4,
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        🔥
      </button>
    </div>
  );
}
