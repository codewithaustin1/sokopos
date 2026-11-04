import React from 'react';
import { MobileSlideDrawer, MobileSlideDrawerProps } from './MobileSlideDrawer';

export type MobileBentoMenuOverlayProps = MobileSlideDrawerProps;

/**
 * MobileBentoMenuOverlay adapter:
 * Delegates to the Accessible Slide-In Drawer Navigation Menu conforming to the
 * WCAG-compliant design and behavior requested by the user.
 */
export const MobileBentoMenuOverlay: React.FC<MobileBentoMenuOverlayProps> = (props) => {
  return <MobileSlideDrawer {...props} />;
};

export default MobileBentoMenuOverlay;
